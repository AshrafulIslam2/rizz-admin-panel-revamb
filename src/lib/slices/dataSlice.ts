import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

interface DataItem {
  id: string;
  title: string;
  content: string;
}

interface DataState {
  items: DataItem[];
  loading: boolean;
  error: string | null;
}

const initialState: DataState = {
  items: [],
  loading: false,
  error: null,
};

// Example async thunk for API calls
export const fetchItems = createAsyncThunk(
  'data/fetchItems',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/data');
      if (!response.ok) {
        throw new Error('Failed to fetch items');
      }
      return await response.json();
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

const dataSlice = createSlice({
  name: 'data',
  initialState,
  reducers: {
    addItem: (state, action: PayloadAction<DataItem>) => {
      state.items.push(action.payload);
    },
    removeItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((item) => item.id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchItems.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchItems.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchItems.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { addItem, removeItem } = dataSlice.actions;
export default dataSlice.reducer;
