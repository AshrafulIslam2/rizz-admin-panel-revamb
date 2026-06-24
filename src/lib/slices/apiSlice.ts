import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3040/api';

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

export interface FaqRecord {
  id: string;
  pageId: PageId | string;
  question: string;
  answer: string;
  short_answer?: string;
  answer_type?: string;
  intent_type?: string;
  seo_title?: string;
  seo_description?: string;
  slug?: string;
  schema_enabled?: boolean;
  ai_summary?: string;
  entity_tags?: string[];
  source_url?: string;
  fact_check_status?: string;
  last_verified_at?: string;
  context?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CategoryRecord {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parent_id?: string | null;
  is_active?: boolean;
  is_featured?: boolean;
  show_on_homepage?: boolean;
  thumbnail_image?: string;
  banner_image?: string;
  seo_title?: string;
  seo_description?: string;
  order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateCategoryPayload {
  name: string;
  slug: string;
  description?: string;
  parent_id?: string;
  is_active?: boolean;
  is_featured?: boolean;
  show_on_homepage?: boolean;
  thumbnail_image?: string;
  banner_image?: string;
  seo_title?: string;
  seo_description?: string;
  order?: number;
}

export interface UpdateCategoryPayload {
  id: string;
  data: CreateCategoryPayload;
}

export interface PatchCategoryPayload {
  id: string;
  data: Partial<CreateCategoryPayload>;
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
  tagTypes: ['Pages', 'Page', 'Hero', 'Faqs', 'Categories'],
  endpoints: (builder) => ({
    getCategories: builder.query<CategoryRecord[], void>({
      query: () => '/categories',
      providesTags: ['Categories'],
    }),
    createCategory: builder.mutation<CategoryRecord, CreateCategoryPayload>({
      query: (payload) => ({
        url: '/categories',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['Categories'],
    }),
    replaceCategory: builder.mutation<CategoryRecord, UpdateCategoryPayload>({
      query: ({ id, data }) => ({
        url: `/categories/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Categories'],
    }),
    patchCategory: builder.mutation<CategoryRecord, PatchCategoryPayload>({
      query: ({ id, data }) => ({
        url: `/categories/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Categories'],
    }),
    deleteCategory: builder.mutation<void, string>({
      query: (id) => ({
        url: `/categories/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Categories'],
    }),
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

    // Get hero directly by hero ID (page ID)
    getHeroById: builder.query<HeroPayload, PageId>({
      query: (heroId) => `/hero/${heroId}`,
      providesTags: ['Hero'],
    }),

    // Patch hero directly by hero ID (partial update)
    patchHeroById: builder.mutation<HeroPayload, { heroId: PageId; data: Partial<HeroPayload> }>({
      query: ({ heroId, data }) => ({
        url: `/hero/${heroId}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Hero'],
    }),

    // FAQs for a page
    getPageFaqs: builder.query<{ faqs: FaqRecord[]; jsonLd?: any }, PageId>({
      query: (pageId) => `/pages/${pageId}/faqs`,
      providesTags: ['Faqs'],
    }),

    getPageFaq: builder.query<FaqRecord, { pageId: PageId; faqId: string }>({
      query: ({ pageId, faqId }) => `/pages/${pageId}/faqs/${faqId}`,
      providesTags: ['Faqs'],
    }),

    createPageFaq: builder.mutation<FaqRecord, { pageId: PageId; data: Partial<FaqRecord> }>({
      query: ({ pageId, data }) => ({
        url: `/pages/${pageId}/faqs`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Faqs'],
    }),

    replacePageFaq: builder.mutation<FaqRecord, { pageId: PageId; faqId: string; data: Partial<FaqRecord> }>({
      query: ({ pageId, faqId, data }) => ({
        url: `/pages/${pageId}/faqs/${faqId}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Faqs', ],
    }),

    patchPageFaq: builder.mutation<FaqRecord, { pageId: PageId; faqId: string; data: Partial<FaqRecord> }>({
      query: ({ pageId, faqId, data }) => ({
        url: `/pages/${pageId}/faqs/${faqId}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Faqs', ],
    }),

    deletePageFaq: builder.mutation<void, { pageId: PageId; faqId: string }>({
      query: ({ pageId, faqId }) => ({
        url: `/pages/${pageId}/faqs/${faqId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Faqs', ]
    }),
  }),
});

export const {
  useGetPagesQuery,
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useReplaceCategoryMutation,
  usePatchCategoryMutation,
  useDeleteCategoryMutation,
  useCreatePageTreeMutation,
  useUpdatePageMutation,
  useDeletePageMutation,
  useCreatePageHeroMutation,
  useGetPageHeroQuery,
  useReplacePageHeroMutation,
  usePatchPageHeroMutation,
  useDeletePageHeroMutation,
  useGetHeroByIdQuery,
  usePatchHeroByIdMutation,
  useGetPageFaqsQuery,
  useGetPageFaqQuery,
  useCreatePageFaqMutation,
  useReplacePageFaqMutation,
  usePatchPageFaqMutation,
  useDeletePageFaqMutation,
} = apiSlice;

