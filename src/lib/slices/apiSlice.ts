import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

type PageId = number | string;

interface PageRecord {
  id: PageId;
  title: string;
  slug: string;
  parentId: PageId | null;
  isVisible: boolean;
  order: number;
  children?: PageRecord[];
}

interface PagePayload {
  title: string;
  slug: string;
  parentId: PageId | null;
  isVisible: boolean;
  order: number;
}

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: (headers) => {
      // Add authorization header if token exists
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Pages', 'Page'],
  endpoints: (builder) => ({
    // Get all pages
    getPages: builder.query<PageRecord[], void>({
      query: () => '/pages',
      providesTags: ['Pages'],
    }),

    // Create a page or nested page tree
    createPageTree: builder.mutation<PageRecord, PagePayload>({
      query: (pageData) => ({
        url: '/pages',
        method: 'POST',
        body: pageData,
      }),
      invalidatesTags: ['Pages'],
    }),

    // Update a page
    updatePage: builder.mutation<PageRecord, { id: PageId; data: PagePayload }>({
      query: ({ id, data }) => ({
        url: `/pages/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Pages', 'Page'],
    }),

    // Delete a page
    deletePage: builder.mutation<void, PageId>({
      query: (id) => ({
        url: `/pages/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Pages'],
    }),
  }),
});

export const {
  useGetPagesQuery,
  useCreatePageTreeMutation,
  useUpdatePageMutation,
  useDeletePageMutation,
} = apiSlice;
