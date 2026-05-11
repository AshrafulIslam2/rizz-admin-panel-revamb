import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

type PageId = number | string;

export interface HeroPayload {
  type: 'IMAGE' | 'VIDEO';
  backgroundImageUrl: string;
  slogan: string;
  title: string;
  subtitle: string;
  keyPoints: string[];
  isActive: boolean;
  order: number;
}

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
  tagTypes: ['Pages', 'Page', 'Hero'],
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

    // Create a hero for a specific page
    createPageHero: builder.mutation<HeroPayload, { pageId: PageId; data: HeroPayload }>({
      query: ({ pageId, data }) => ({
        url: `/pages/${pageId}/hero`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Hero'],
    }),

    // Get a hero for a specific page
    getPageHero: builder.query<HeroPayload, PageId>({
      query: (pageId) => `/pages/${pageId}/hero`,
      providesTags: ['Hero'],
    }),

    // Replace a hero for a specific page
    replacePageHero: builder.mutation<HeroPayload, { pageId: PageId; data: HeroPayload }>({
      query: ({ pageId, data }) => ({
        url: `/pages/${pageId}/hero`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Hero'],
    }),

    // Partially update a hero for a specific page
    patchPageHero: builder.mutation<HeroPayload, { pageId: PageId; data: Partial<HeroPayload> }>({
      query: ({ pageId, data }) => ({
        url: `/pages/${pageId}/hero`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Hero'],
    }),

    // Delete a hero for a specific page
    deletePageHero: builder.mutation<void, PageId>({
      query: (pageId) => ({
        url: `/pages/${pageId}/hero`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Hero'],
    }),
  }),
});

export const {
  useGetPagesQuery,
  useCreatePageTreeMutation,
  useUpdatePageMutation,
  useDeletePageMutation,
  useCreatePageHeroMutation,
  useGetPageHeroQuery,
  useReplacePageHeroMutation,
  usePatchPageHeroMutation,
  useDeletePageHeroMutation,
} = apiSlice;
