'use client';

import { useGetDataQuery, useCreateDataMutation, useDeleteDataMutation } from '@/lib/slices/apiSlice';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { fetchItems } from '@/lib/slices/dataSlice';
import { useEffect, useState } from 'react';

/**
 * Example component showing how to use Redux for API calls
 * 
 * Two approaches demonstrated:
 * 1. RTK Query (useGetDataQuery hook) - for simple CRUD operations
 * 2. Redux Thunk (fetchItems) - for more complex async logic
 */

export default function ExampleReduxComponent() {
  const dispatch = useAppDispatch();

  // RTK Query approach - automatic caching, refetching, etc.
  const { data, isLoading, error } = useGetDataQuery();
  const [createData] = useCreateDataMutation();
  const [deleteData] = useDeleteDataMutation();

  // Redux Thunk approach - more control over state
  const dataSliceState = useAppSelector((state) => (state as any).data);
  const [useRtkQuery, setUseRtkQuery] = useState(true);

  useEffect(() => {
    // Fetch data on component mount if using Redux Thunk
    if (!useRtkQuery) {
      dispatch(fetchItems() as any);
    }
  }, [dispatch, useRtkQuery]);

  const handleCreateData = async () => {
    try {
      await createData({
        title: 'New Item',
        content: 'Sample content',
      }).unwrap();
      alert('Data created successfully');
    } catch (error) {
      alert('Error creating data: ' + (error as Error).message);
    }
  };

  const handleDeleteData = async (id: string) => {
    try {
      await deleteData(id).unwrap();
      alert('Data deleted successfully');
    } catch (error) {
      alert('Error deleting data: ' + (error as Error).message);
    }
  };

  const displayData = useRtkQuery ? data : dataSliceState.items;
  const isDataLoading = useRtkQuery ? isLoading : dataSliceState.loading;
  const dataError = useRtkQuery ? error : dataSliceState.error;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Redux API Integration Example</h1>

      <div className="mb-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={useRtkQuery}
            onChange={(e) => setUseRtkQuery(e.target.checked)}
            className="w-4 h-4"
          />
          <span>Use RTK Query (recommended for simple CRUD)</span>
        </label>
      </div>

      {isDataLoading && <p className="text-blue-600">Loading...</p>}
      {dataError && (
        <p className="text-red-600">Error: {String(dataError)}</p>
      )}

      <button
        onClick={handleCreateData}
        className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Create New Data
      </button>

      {displayData && Array.isArray(displayData) && (
        <div className="space-y-4">
          {displayData.map((item: any) => (
            <div
              key={item.id}
              className="p-4 border rounded hover:shadow-lg transition"
            >
              <h3 className="font-semibold text-lg">{item.title}</h3>
              <p className="text-gray-600 mt-2">{item.content}</p>
              <button
                onClick={() => handleDeleteData(item.id)}
                className="mt-3 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h3 className="font-semibold mb-2">Implementation Guide:</h3>
        <ul className="list-disc list-inside space-y-2 text-sm">
          <li>API endpoints are defined in <code className="bg-white px-2 py-1 rounded">src/lib/slices/apiSlice.ts</code></li>
          <li>Redux store is configured in <code className="bg-white px-2 py-1 rounded">src/lib/store.ts</code></li>
          <li>Use <code className="bg-white px-2 py-1 rounded">useAppDispatch</code> and <code className="bg-white px-2 py-1 rounded">useAppSelector</code> from <code className="bg-white px-2 py-1 rounded">src/lib/hooks.ts</code></li>
          <li>Set your API base URL in the <code className="bg-white px-2 py-1 rounded">NEXT_PUBLIC_API_URL</code> environment variable</li>
        </ul>
      </div>
    </div>
  );
}
