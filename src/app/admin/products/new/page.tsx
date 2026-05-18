"use client"
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const tabs = [
  'Basic Info',
  'Pricing & Inventory',
  'Variants',
  'Images',
  'SEO',
  'Translations',
  'FAQs',
  'Reviews',
  'Preview',
]

const initialForm = {
  product_id: '',
  sku: '',
  name: '',
  slug: '',
  short_description: '',
  description: '',
  key_features: '',
  materials: '',
  use_cases: '',
  benefits: '',
  brand_id: '',
  category_id: '',
  status: 'active',
  is_featured: false,
  is_published: false,
  tags: '',
  gender: '',
  age_group: '',
  material: '',
  tax_class: '',
  seo: {
    meta_title: '',
    meta_description: '',
    meta_keywords: '',
    canonical_url: '',
    slug: '',
    og_title: '',
    og_description: '',
    og_image: '',
    schema_json: '{"@type":"Product"}',
  },
  price: '',
  inventory: '',
  images: [],
  variants: [],
  translations: {},
  faqs: [],
}

function toList(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

function toTags(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

const shellCard =
  'rounded-[2rem] border border-white/70 bg-white/80 shadow-[0_30px_100px_rgba(15,23,42,0.10)] backdrop-blur-xl'
const sectionCard = 'rounded-2xl border border-slate-200 bg-white/90 shadow-sm'
const softCard = 'rounded-2xl border border-slate-200/80 bg-slate-50/80'
const fieldClass =
  'block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-200'
const labelClass = 'text-sm font-medium text-slate-700'
const primaryButton =
  'inline-flex items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-950/15 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
const secondaryButton =
  'inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50'
const tabButton = (active: boolean) =>
  `rounded-full px-4 py-2 text-sm font-medium transition ${
    active ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white'
  }`

export default function NewProductPage() {
  const router = useRouter()
  const [active, setActive] = useState(0)
  const [loading, setLoading] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [seoErrors, setSeoErrors] = useState<string[]>([])
  const [form, setForm] = useState<any>(initialForm)
  const [categories, setCategories] = useState<any[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [variantForm, setVariantForm] = useState({
    sku: '',
    variant_name: '',
    price: '',
    sale_price: '',
    stock_qty: '',
    color: '',
    size: '',
    barcode: '',
    is_default: false,
    status: 'active',
  })
  const [variantLoading, setVariantLoading] = useState(false)
  const [variantError, setVariantError] = useState<string | null>(null)
  const [variantSuccess, setVariantSuccess] = useState<string | null>(null)
  const [mediaUploading, setMediaUploading] = useState(false)
  const [mediaError, setMediaError] = useState<string | null>(null)
  const [mediaSaving, setMediaSaving] = useState(false)
  const [mediaSuccess, setMediaSuccess] = useState<string | null>(null)
  const mediaCount = Array.isArray(form.images) ? form.images.length : 0
  const completionSteps = [form.name, form.slug, form.category_id, form.seo.meta_title, form.seo.meta_description]
  const completion = Math.round((completionSteps.filter(Boolean).length / completionSteps.length) * 100)

  useEffect(() => {
    let isMounted = true
    async function loadCategories() {
      try {
        const res = await fetch('http://localhost:3040/api/categories')
        if (!res.ok) throw new Error('Failed to load categories')
        const data = await res.json()
        if (isMounted) {
          setCategories(Array.isArray(data) ? data : [])
        }
      } catch (err) {
        if (isMounted) {
          setCategories([])
        }
      } finally {
        if (isMounted) {
          setCategoriesLoading(false)
        }
      }
    }

    loadCategories()
    return () => {
      isMounted = false
    }
  }, [])

  function update<K extends string>(key: K, value: any) {
    setForm((s: any) => ({ ...s, [key]: value }))
  }

  function updateSeo(key: string, value: string) {
    setForm((s: any) => ({ ...s, seo: { ...s.seo, [key]: value } }))
  }

  function buildPayload() {
    let schemaJson: any = form.seo.schema_json
    try {
      schemaJson = form.seo.schema_json ? JSON.parse(form.seo.schema_json) : null
    } catch {
      schemaJson = form.seo.schema_json
    }

    return {
      sku: form.sku,
      name: form.name,
      slug: form.slug,
      short_description: form.short_description,
      description: form.description,
      key_features: toList(form.key_features),
      materials: toList(form.materials),
      use_cases: toList(form.use_cases),
      benefits: toList(form.benefits),
      // specifications and how_to_use intentionally omitted (backend rejects these properties)
      brand_id: form.brand_id,
      category_id: form.category_id,
      status: form.status,
      is_featured: form.is_featured,
      is_published: form.is_published,
      tags: toTags(form.tags),
      gender: form.gender,
      age_group: form.age_group,
      material: form.material,
      tax_class: form.tax_class,
      seo: {
        meta_title: form.seo.meta_title,
        meta_description: form.seo.meta_description,
        meta_keywords: form.seo.meta_keywords,
        canonical_url: form.seo.canonical_url,
        slug: form.seo.slug,
        og_title: form.seo.og_title,
        og_description: form.seo.og_description,
        og_image: form.seo.og_image,
        schema_json: schemaJson,
      },
      price: form.price ? Number(form.price) : undefined,
      inventory: form.inventory ? Number(form.inventory) : undefined,
      images: Array.isArray(form.images)
        ? form.images.map((media: any) => {
            const { __file, ...rest } = media || {}
            return {
              media_type: rest.media_type || 'IMAGE',
              media_url: rest.media_url,
              thumbnail_url: rest.thumbnail_url || rest.media_url,
              alt_text: rest.alt_text || '',
              title: rest.title || '',
              sort_order: rest.sort_order ?? 1,
              is_primary: Boolean(rest.is_primary),
              is_featured: Boolean(rest.is_featured),
              status: rest.status || 'ACTIVE',
              variant_id: rest.variant_id ?? null,
            }
          })
        : [],
    }
  }

  function validateSeo() {
    const errors: string[] = []
    if (!form.seo.meta_title?.trim()) errors.push('seo.meta_title should not be empty')
    if (!form.seo.meta_description?.trim()) errors.push('seo.meta_description should not be empty')
    if (!form.seo.slug?.trim()) errors.push('seo.slug should not be empty')
    setSeoErrors(errors)
    return errors.length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!validateSeo()) {
      setActive(4)
      return
    }
    setLoading(true)
    try {
      const payload = buildPayload()
      const res = await fetch('http://localhost:3040/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const json = await res.json()
        setError(json?.error || 'Failed to create product')
        setLoading(false)
        return
      }
      const created = await res.json()
      setLoading(false)
      router.push(`/products/${created.id}`)
    } catch (err: any) {
      setError(err.message || 'Network error')
      setLoading(false)
    }
  }

  async function handleBasicNext() {
    if (!form.name) {
      setError('Name is required before continuing.')
      return
    }

    setError(null)
    setSavingDraft(true)
    try {
      const payload = {
        ...buildPayload(),
        status: 'draft',
        is_published: false,
      }
      // backend returns 400 if `images` is present during initial/basic save
      if (payload.images) delete payload.images
      const res = await fetch('http://localhost:3040/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const json = await res.json()
        setError(json?.error || 'Failed to save draft')
        setSavingDraft(false)
        return
      }
      const created = await res.json()
      if (created?.id) {
        setForm((s: any) => ({ ...s, product_id: created.id }))
      }
      setSavingDraft(false)
      setActive(1)
    } catch (err: any) {
      setError(err.message || 'Network error')
      setSavingDraft(false)
    }
  }

  async function handleCreateVariant(e: React.FormEvent) {
    e.preventDefault()
    setVariantError(null)
    setVariantSuccess(null)

    const productId = form.product_id?.trim()
    if (!productId) {
      setVariantError('Product ID is required. Save Basic Info first or enter a Product ID.')
      return
    }

    setVariantLoading(true)
    try {
      const payload = {
        sku: variantForm.sku,
        variant_name: variantForm.variant_name,
        price: variantForm.price ? Number(variantForm.price) : undefined,
        sale_price: variantForm.sale_price ? Number(variantForm.sale_price) : undefined,
        stock_qty: variantForm.stock_qty ? Number(variantForm.stock_qty) : undefined,
        attributes: {
          color: variantForm.color,
          size: variantForm.size,
        },
        barcode: variantForm.barcode,
        is_default: variantForm.is_default,
        status: variantForm.status,
      }

      const res = await fetch(`http://localhost:3040/api/products/${productId}/variants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const json = await res.json()
        setVariantError(json?.error || 'Failed to create variant')
        setVariantLoading(false)
        return
      }

      setVariantLoading(false)
      setVariantSuccess('Variant created successfully.')
      setVariantForm({
        sku: '',
        variant_name: '',
        price: '',
        sale_price: '',
        stock_qty: '',
        color: '',
        size: '',
        barcode: '',
        is_default: false,
        status: 'active',
      })
    } catch (err: any) {
      setVariantError(err.message || 'Network error')
      setVariantLoading(false)
    }
  }

  async function uploadMediaFile(file: File) {
    const uploadForm = new FormData()
    uploadForm.append('file', file)

    const res = await fetch('/api/media/upload', {
      method: 'POST',
      body: uploadForm,
    })

    const data = await res.json()
    if (!res.ok) {
      throw new Error(data?.error || 'Failed to upload media')
    }

    return data
  }

  async function saveProductMedia(productId: string, media: any) {
    const base = (process.env.NEXT_PUBLIC_API_URL as string) || 'http://localhost:3040/api'
    const url = `${base.replace(/\/$/, '')}/products/${productId}/media`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(media),
    })

    const data = await res.json().catch(() => null)
    if (!res.ok) {
      throw new Error(data?.error || 'Failed to save product media')
    }

    return data
  }

  function getMediaDraft() {
    return Array.isArray(form.images) && form.images[0] ? form.images[0] : null
  }

  function updateMediaDraft(key: string, value: any) {
    setForm((s: any) => {
      const current = Array.isArray(s.images) && s.images[0] ? s.images[0] : {}
      return {
        ...s,
        images: [{ ...current, [key]: value }],
      }
    })
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files) return
    const input = e.currentTarget
    setMediaError(null)
    setMediaUploading(true)

    try {
      const file = files[0]
      const productId = form.product_id?.trim()
      if (!productId) {
        throw new Error('Product ID is required before uploading media.')
      }

      if (!file.type.startsWith('image/')) {
        throw new Error('Only image files are supported for upload.')
      }

      const uploaded = await uploadMediaFile(file)
      setMediaSuccess(null)
      setForm((s: any) => ({
        ...s,
        images: [
          {
            media_type: 'IMAGE',
            media_url: uploaded.media_url,
            thumbnail_url: uploaded.thumbnail_url || uploaded.media_url,
            alt_text: '',
            title: '',
            sort_order: 1,
            is_primary: true,
            is_featured: false,
            status: 'DRAFT',
            variant_id: null,
          },
        ],
      }))
    } catch (err: any) {
      setMediaError(err?.message || 'Failed to upload media')
    } finally {
      setMediaUploading(false)
      input.value = ''
    }
  }

  async function handleSaveMedia() {
    const productId = form.product_id?.trim()
    const media = getMediaDraft()

    setMediaError(null)
    setMediaSuccess(null)

    if (!productId) {
      setMediaError('Product ID is required before saving media.')
      return
    }

    if (!media?.media_url) {
      setMediaError('Upload an image first.')
      return
    }

    setMediaSaving(true)
    try {
      const payload = {
        media_type: media.media_type || 'IMAGE',
        media_url: media.media_url,
        thumbnail_url: media.thumbnail_url || media.media_url,
        alt_text: media.alt_text || '',
        title: media.title || '',
        sort_order: media.sort_order ? Number(media.sort_order) : 1,
        is_primary: Boolean(media.is_primary),
        is_featured: Boolean(media.is_featured),
        status: media.status || 'DRAFT',
        variant_id: media.variant_id || null,
      }

      const saved = await saveProductMedia(productId, payload)
      const savedMedia = saved?.data ?? saved
      setForm((s: any) => ({
        ...s,
        images: [
          {
            media_type: savedMedia?.media_type || payload.media_type,
            media_url: savedMedia?.media_url || payload.media_url,
            thumbnail_url: savedMedia?.thumbnail_url || payload.thumbnail_url,
            alt_text: savedMedia?.alt_text ?? payload.alt_text,
            title: savedMedia?.title ?? payload.title,
            sort_order: savedMedia?.sort_order ?? payload.sort_order,
            is_primary: Boolean(savedMedia?.is_primary ?? payload.is_primary),
            is_featured: Boolean(savedMedia?.is_featured ?? payload.is_featured),
            status: savedMedia?.status || payload.status,
            variant_id: savedMedia?.variant_id ?? payload.variant_id,
          },
        ],
      }))
      setMediaSuccess('Media saved successfully.')
    } catch (err: any) {
      setMediaError(err?.message || 'Failed to save media')
    } finally {
      setMediaSaving(false)
    }
  }

  function updateImageField(index: number, key: string, value: any) {
    setForm((s: any) => {
      const images = Array.isArray(s.images) ? [...s.images] : []
      images[index] = { ...images[index], [key]: value }
      return { ...s, images }
    })
  }

  function removeImage(index: number) {
    setForm((s: any) => {
      const images = Array.isArray(s.images) ? [...s.images] : []
      images.splice(index, 1)
      return { ...s, images }
    })
  }

  function moveImage(index: number, dir: -1 | 1) {
    setForm((s: any) => {
      const images = Array.isArray(s.images) ? [...s.images] : []
      const to = index + dir
      if (to < 0 || to >= images.length) return s
      const tmp = images[to]
      images[to] = images[index]
      images[index] = tmp
      return { ...s, images: images.map((im: any, i: number) => ({ ...im, sort_order: i + 1 })) }
    })
  }

  function setPrimary(index: number) {
    setForm((s: any) => {
      const images = Array.isArray(s.images) ? s.images.map((im: any, i: number) => ({ ...im, is_primary: i === index })) : []
      return { ...s, images }
    })
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className={shellCard}>
        <div className="border-b border-slate-200/80 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 px-6 py-6 text-white sm:px-8 lg:px-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-slate-200">
                Product builder
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Create Product</h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
                  Build products with clean media, SEO, and variant controls in one modern workspace.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:w-[28rem]">
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Status</p>
                <p className="mt-1 text-sm font-semibold text-white">{form.status || 'active'}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Media</p>
                <p className="mt-1 text-sm font-semibold text-white">{mediaCount} item{mediaCount === 1 ? '' : 's'}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Progress</p>
                <p className="mt-1 text-sm font-semibold text-white">{completion}% ready</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:px-8 lg:py-8">
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-950 p-2 shadow-lg shadow-slate-950/10">
              <div className="flex gap-1 overflow-x-auto scrollbar-none">
                {tabs.map((t, i) => (
                  <button key={t} onClick={() => setActive(i)} className={tabButton(i === active)}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className={`${sectionCard} p-4 sm:p-6`}>
              {active === 0 && (
            <section className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <div className={labelClass + ' mb-2'}>SKU</div>
                  <input value={form.sku} onChange={(e) => update('sku', e.target.value)} className={fieldClass} />
                </label>
                <label className="block">
                  <div className={labelClass + ' mb-2'}>Name</div>
                  <input
                    value={form.name}
                    onChange={(e) => update('name', e.target.value)}
                    required
                    className={fieldClass}
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <div className="text-sm font-medium mb-1">Slug</div>
                  <input
                    value={form.slug}
                    onChange={(e) => update('slug', e.target.value)}
                    placeholder="classic-sneakers"
                    className="block w-full px-3 py-2 border rounded-md bg-white"
                  />
                </label>
                <label className="block">
                  <div className="text-sm font-medium mb-1">Short description</div>
                  <input
                    value={form.short_description}
                    onChange={(e) => update('short_description', e.target.value)}
                    className="block w-full px-3 py-2 border rounded-md bg-white"
                  />
                </label>
              </div>

              <label className="block">
                <div className="text-sm font-medium mb-1">Description</div>
                <textarea
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                  className="block w-full px-3 py-2 border rounded-md bg-white"
                />
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <div className="text-sm font-medium mb-1">Brand ID</div>
                  <input value={form.brand_id} onChange={(e) => update('brand_id', e.target.value)} className="block w-full px-3 py-2 border rounded-md bg-white" />
                </label>
                <label className="block">
                  <div className="text-sm font-medium mb-1">Category</div>
                  <select
                    value={form.category_id}
                    onChange={(e) => update('category_id', e.target.value)}
                    className="block w-full px-3 py-2 border rounded-md bg-white"
                    disabled={categoriesLoading}
                  >
                    <option value="">Select category</option>
                    {categories.map((category: any) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {categoriesLoading && <p className="text-xs text-slate-500 mt-1">Loading categories...</p>}
                  {!categoriesLoading && categories.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {categories.map((category: any) => (
                        <span key={category.id} className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                          {category.name}
                        </span>
                      ))}
                    </div>
                  )}
                  {!categoriesLoading && categories.length === 0 && (
                    <p className="text-xs text-slate-500 mt-1">No categories found.</p>
                  )}
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="block">
                  <div className="text-sm font-medium mb-1">Status</div>
                  <select value={form.status} onChange={(e) => update('status', e.target.value)} className="block w-full px-3 py-2 border rounded-md bg-white">
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 mt-6">
                  <input type="checkbox" checked={form.is_featured} onChange={(e) => update('is_featured', e.target.checked)} className="h-4 w-4" />
                  <span className="text-sm">Featured</span>
                </label>
                <label className="flex items-center gap-2 mt-6">
                  <input type="checkbox" checked={form.is_published} onChange={(e) => update('is_published', e.target.checked)} className="h-4 w-4" />
                  <span className="text-sm">Published</span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="block">
                  <div className="text-sm font-medium mb-1">Gender</div>
                  <select value={form.gender} onChange={(e) => update('gender', e.target.value)} className="block w-full px-3 py-2 border rounded-md bg-white">
                    <option value="">Select</option>
                    <option value="men">Men</option>
                    <option value="women">Women</option>
                    <option value="unisex">Unisex</option>
                  </select>
                </label>
                <label className="block">
                  <div className="text-sm font-medium mb-1">Age group</div>
                  <input value={form.age_group} onChange={(e) => update('age_group', e.target.value)} className="block w-full px-3 py-2 border rounded-md bg-white" />
                </label>
                <label className="block">
                  <div className="text-sm font-medium mb-1">Tax class</div>
                  <input value={form.tax_class} onChange={(e) => update('tax_class', e.target.value)} className="block w-full px-3 py-2 border rounded-md bg-white" />
                </label>
              </div>

              <label className="block">
                <div className="text-sm font-medium mb-1">Material</div>
                <input value={form.material} onChange={(e) => update('material', e.target.value)} className="block w-full px-3 py-2 border rounded-md bg-white" />
              </label>

              <label className="block">
                <div className="text-sm font-medium mb-1">Tags (comma separated)</div>
                <input value={form.tags} onChange={(e) => update('tags', e.target.value)} className="block w-full px-3 py-2 border rounded-md bg-white" />
              </label>

              <label className="block">
                <div className="text-sm font-medium mb-1">Key features (one per line)</div>
                <textarea value={form.key_features} onChange={(e) => update('key_features', e.target.value)} className="block w-full px-3 py-2 border rounded-md bg-white" />
              </label>

              <label className="block">
                <div className="text-sm font-medium mb-1">Materials (one per line)</div>
                <textarea value={form.materials} onChange={(e) => update('materials', e.target.value)} className="block w-full px-3 py-2 border rounded-md bg-white" />
              </label>

              <label className="block">
                <div className="text-sm font-medium mb-1">Use cases (one per line)</div>
                <textarea value={form.use_cases} onChange={(e) => update('use_cases', e.target.value)} className="block w-full px-3 py-2 border rounded-md bg-white" />
              </label>

              <label className="block">
                <div className="text-sm font-medium mb-1">Benefits (one per line)</div>
                <textarea value={form.benefits} onChange={(e) => update('benefits', e.target.value)} className="block w-full px-3 py-2 border rounded-md bg-white" />
              </label>
              

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <div className="text-sm font-medium mb-1">Meta title</div>
                  <input
                    value={form.seo.meta_title}
                    onChange={(e) => updateSeo('meta_title', e.target.value)}
                    className="block w-full px-3 py-2 border rounded-md bg-white"
                  />
                </label>
                <label className="block">
                  <div className="text-sm font-medium mb-1">SEO Slug</div>
                  <input
                    value={form.seo.slug}
                    onChange={(e) => updateSeo('slug', e.target.value)}
                    className="block w-full px-3 py-2 border rounded-md bg-white"
                  />
                </label>
              </div>

              <label className="block">
                <div className="text-sm font-medium mb-1">Meta description</div>
                <textarea
                  value={form.seo.meta_description}
                  onChange={(e) => updateSeo('meta_description', e.target.value)}
                  className="block w-full px-3 py-2 border rounded-md bg-white"
                />
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <div className="text-sm font-medium mb-1">Meta keywords (comma separated)</div>
                  <input
                    value={form.seo.meta_keywords}
                    onChange={(e) => updateSeo('meta_keywords', e.target.value)}
                    className="block w-full px-3 py-2 border rounded-md bg-white"
                  />
                </label>
                <label className="block">
                  <div className="text-sm font-medium mb-1">Canonical URL</div>
                  <input
                    value={form.seo.canonical_url}
                    onChange={(e) => updateSeo('canonical_url', e.target.value)}
                    placeholder="https://example.com/product/classic-sneakers"
                    className="block w-full px-3 py-2 border rounded-md bg-white"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <div className="text-sm font-medium mb-1">OG Title</div>
                  <input
                    value={form.seo.og_title}
                    onChange={(e) => updateSeo('og_title', e.target.value)}
                    className="block w-full px-3 py-2 border rounded-md bg-white"
                  />
                </label>
                <label className="block">
                  <div className="text-sm font-medium mb-1">OG Image URL</div>
                  <input
                    value={form.seo.og_image}
                    onChange={(e) => updateSeo('og_image', e.target.value)}
                    placeholder="https://cdn.example.com/og-image.jpg"
                    className="block w-full px-3 py-2 border rounded-md bg-white"
                  />
                </label>
              </div>

              <label className="block">
                <div className="text-sm font-medium mb-1">OG description</div>
                <textarea
                  value={form.seo.og_description}
                  onChange={(e) => updateSeo('og_description', e.target.value)}
                  className="block w-full px-3 py-2 border rounded-md bg-white"
                />
              </label>
            </section>
          )}

              {active === 1 && (
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="block">
                <div className="text-sm font-medium mb-1">Price</div>
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => update('price', e.target.value)}
                  className="block w-full px-3 py-2 border rounded-md bg-white"
                />
              </label>
              <label className="block">
                <div className="text-sm font-medium mb-1">Inventory</div>
                <input type="number" value={form.inventory} onChange={(e) => update('inventory', e.target.value)} className="block w-full px-3 py-2 border rounded-md bg-white" />
              </label>
            </section>
          )}

              {active === 2 && (
            <section className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <div className="text-sm font-medium mb-1">Product ID</div>
                  <input
                    value={form.product_id}
                    onChange={(e) => update('product_id', e.target.value)}
                    placeholder="prod_123"
                    className="block w-full px-3 py-2 border rounded-md bg-white"
                  />
                </label>
                <label className="block">
                  <div className="text-sm font-medium mb-1">Variant SKU</div>
                  <input
                    value={variantForm.sku}
                    onChange={(e) => setVariantForm((s) => ({ ...s, sku: e.target.value }))}
                    className="block w-full px-3 py-2 border rounded-md bg-white"
                  />
                </label>
              </div>

              <label className="block">
                <div className="text-sm font-medium mb-1">Variant name</div>
                <input
                  value={variantForm.variant_name}
                  onChange={(e) => setVariantForm((s) => ({ ...s, variant_name: e.target.value }))}
                  className="block w-full px-3 py-2 border rounded-md bg-white"
                />
              </label>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="block">
                  <div className="text-sm font-medium mb-1">Price</div>
                  <input
                    type="number"
                    value={variantForm.price}
                    onChange={(e) => setVariantForm((s) => ({ ...s, price: e.target.value }))}
                    className="block w-full px-3 py-2 border rounded-md bg-white"
                  />
                </label>
                <label className="block">
                  <div className="text-sm font-medium mb-1">Sale price</div>
                  <input
                    type="number"
                    value={variantForm.sale_price}
                    onChange={(e) => setVariantForm((s) => ({ ...s, sale_price: e.target.value }))}
                    className="block w-full px-3 py-2 border rounded-md bg-white"
                  />
                </label>
                <label className="block">
                  <div className="text-sm font-medium mb-1">Stock qty</div>
                  <input
                    type="number"
                    value={variantForm.stock_qty}
                    onChange={(e) => setVariantForm((s) => ({ ...s, stock_qty: e.target.value }))}
                    className="block w-full px-3 py-2 border rounded-md bg-white"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <div className="text-sm font-medium mb-1">Color</div>
                  <input
                    value={variantForm.color}
                    onChange={(e) => setVariantForm((s) => ({ ...s, color: e.target.value }))}
                    className="block w-full px-3 py-2 border rounded-md bg-white"
                  />
                </label>
                <label className="block">
                  <div className="text-sm font-medium mb-1">Size</div>
                  <input
                    value={variantForm.size}
                    onChange={(e) => setVariantForm((s) => ({ ...s, size: e.target.value }))}
                    className="block w-full px-3 py-2 border rounded-md bg-white"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <div className="text-sm font-medium mb-1">Barcode</div>
                  <input
                    value={variantForm.barcode}
                    onChange={(e) => setVariantForm((s) => ({ ...s, barcode: e.target.value }))}
                    className="block w-full px-3 py-2 border rounded-md bg-white"
                  />
                </label>
                <label className="block">
                  <div className="text-sm font-medium mb-1">Status</div>
                  <select
                    value={variantForm.status}
                    onChange={(e) => setVariantForm((s) => ({ ...s, status: e.target.value }))}
                    className="block w-full px-3 py-2 border rounded-md bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={variantForm.is_default}
                  onChange={(e) => setVariantForm((s) => ({ ...s, is_default: e.target.checked }))}
                  className="h-4 w-4"
                />
                <span className="text-sm">Default variant</span>
              </label>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCreateVariant}
                  className="px-4 py-2 rounded-md bg-slate-900 text-white"
                  disabled={variantLoading}
                >
                  {variantLoading ? 'Saving...' : 'Create Variant'}
                </button>
                {variantSuccess && <p className="text-sm text-emerald-600">{variantSuccess}</p>}
                {variantError && <p className="text-sm text-rose-600">{variantError}</p>}
              </div>
            </section>
          )}

              {active === 3 && (
            <section className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <div className="text-sm font-semibold text-slate-900">Media upload</div>
                <input type="file" accept="image/*" onChange={handleFiles} className="block" />
                <p className="text-xs text-slate-500 mt-1">Image uploads fill only Media URL and Thumbnail URL from ImageBB. Save the rest manually, then click Save Media.</p>
                {mediaUploading && <p className="text-xs text-slate-600 mt-2">Uploading media...</p>}
                {mediaError && <p className="text-xs text-rose-600 mt-2">{mediaError}</p>}
                {mediaSuccess && <p className="text-xs text-emerald-600 mt-2">{mediaSuccess}</p>}
              </div>

              {!getMediaDraft() ? (
                <p className="text-sm text-slate-500">Upload one image to start the media draft.</p>
              ) : (
                <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 lg:grid-cols-[140px_minmax(0,1fr)_auto]">
                  <div className="space-y-2">
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Preview</div>
                    <div className="w-full h-28 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center">
                      <img src={getMediaDraft()?.thumbnail_url || getMediaDraft()?.media_url} alt="Media preview" className="object-cover w-full h-full" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Media source</div>
                      <label className="block space-y-1">
                        <span className="text-xs text-slate-600">Media URL</span>
                        <input
                          value={getMediaDraft()?.media_url || ''}
                          readOnly
                          className="block w-full px-3 py-2 border rounded-md bg-slate-100 text-slate-600"
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-xs text-slate-600">Thumbnail URL</span>
                        <input
                          value={getMediaDraft()?.thumbnail_url || ''}
                          readOnly
                          className="block w-full px-3 py-2 border rounded-md bg-slate-100 text-slate-600"
                        />
                      </label>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Manual fields</div>
                      <label className="block space-y-1">
                        <span className="text-xs text-slate-600">Title</span>
                        <input
                          value={getMediaDraft()?.title || ''}
                          onChange={(e) => updateMediaDraft('title', e.target.value)}
                          placeholder="Title"
                          className="block w-full px-3 py-2 border rounded-md bg-white"
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-xs text-slate-600">Alt text</span>
                        <input
                          value={getMediaDraft()?.alt_text || ''}
                          onChange={(e) => updateMediaDraft('alt_text', e.target.value)}
                          placeholder="Alt text"
                          className="block w-full px-3 py-2 border rounded-md bg-white"
                        />
                      </label>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <label className="block space-y-1">
                          <span className="text-xs text-slate-600">Sort order</span>
                          <input
                            type="number"
                            value={getMediaDraft()?.sort_order ?? 1}
                            onChange={(e) => updateMediaDraft('sort_order', Number(e.target.value))}
                            className="block w-full px-3 py-2 border rounded-md bg-white"
                          />
                        </label>
                        <label className="block space-y-1">
                          <span className="text-xs text-slate-600">Status</span>
                          <select
                            value={getMediaDraft()?.status || 'DRAFT'}
                            onChange={(e) => updateMediaDraft('status', e.target.value)}
                            className="block w-full px-3 py-2 border rounded-md bg-white"
                          >
                            <option value="DRAFT">DRAFT</option>
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="ARCHIVED">ARCHIVED</option>
                          </select>
                        </label>
                      </div>
                      <label className="block space-y-1">
                        <span className="text-xs text-slate-600">Variant ID</span>
                        <input
                          value={getMediaDraft()?.variant_id ?? ''}
                          onChange={(e) => updateMediaDraft('variant_id', e.target.value || null)}
                          placeholder="Variant ID"
                          className="block w-full px-3 py-2 border rounded-md bg-white"
                        />
                      </label>
                      <div className="flex flex-wrap gap-4 pt-1">
                        <label className="flex items-center gap-2">
                          <input type="radio" name="primary" checked={Boolean(getMediaDraft()?.is_primary)} onChange={() => updateMediaDraft('is_primary', true)} className="h-4 w-4" />
                          <span className="text-sm">Primary</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input type="checkbox" checked={Boolean(getMediaDraft()?.is_featured)} onChange={(e) => updateMediaDraft('is_featured', e.target.checked)} className="h-4 w-4" />
                          <span className="text-sm">Featured</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-row gap-2 lg:flex-col lg:justify-start">
                    <button type="button" onClick={handleSaveMedia} className={primaryButton} disabled={mediaSaving}>
                      {mediaSaving ? 'Saving...' : 'Save Media'}
                    </button>
                    <button type="button" onClick={() => setForm((s: any) => ({ ...s, images: [] }))} className={secondaryButton}>
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

              {active === 4 && (
            <section className="space-y-4">
              {seoErrors.length > 0 && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <p className="font-medium">SEO fields required</p>
                  <ul className="list-disc ml-5 mt-2">
                    {seoErrors.map((message) => (
                      <li key={message}>{message}</li>
                    ))}
                  </ul>
                </div>
              )}
              <label className="block">
                <div className="text-sm font-medium mb-1">Meta title</div>
                <input value={form.seo.meta_title} onChange={(e) => updateSeo('meta_title', e.target.value)} className="block w-full px-3 py-2 border rounded-md bg-white" />
              </label>
              <label className="block">
                <div className="text-sm font-medium mb-1">Meta description</div>
                <textarea value={form.seo.meta_description} onChange={(e) => updateSeo('meta_description', e.target.value)} className="block w-full px-3 py-2 border rounded-md bg-white" />
              </label>
              <label className="block">
                <div className="text-sm font-medium mb-1">Meta keywords</div>
                <input value={form.seo.meta_keywords} onChange={(e) => updateSeo('meta_keywords', e.target.value)} className="block w-full px-3 py-2 border rounded-md bg-white" />
              </label>
              <label className="block">
                <div className="text-sm font-medium mb-1">Canonical URL</div>
                <input value={form.seo.canonical_url} onChange={(e) => updateSeo('canonical_url', e.target.value)} className="block w-full px-3 py-2 border rounded-md bg-white" />
              </label>
              <label className="block">
                <div className="text-sm font-medium mb-1">SEO Slug</div>
                <input value={form.seo.slug} onChange={(e) => updateSeo('slug', e.target.value)} className="block w-full px-3 py-2 border rounded-md bg-white" />
              </label>
              <label className="block">
                <div className="text-sm font-medium mb-1">OG title</div>
                <input value={form.seo.og_title} onChange={(e) => updateSeo('og_title', e.target.value)} className="block w-full px-3 py-2 border rounded-md bg-white" />
              </label>
              <label className="block">
                <div className="text-sm font-medium mb-1">OG description</div>
                <textarea value={form.seo.og_description} onChange={(e) => updateSeo('og_description', e.target.value)} className="block w-full px-3 py-2 border rounded-md bg-white" />
              </label>
              <label className="block">
                <div className="text-sm font-medium mb-1">OG image</div>
                <input value={form.seo.og_image} onChange={(e) => updateSeo('og_image', e.target.value)} className="block w-full px-3 py-2 border rounded-md bg-white" />
              </label>
              <label className="block">
                <div className="text-sm font-medium mb-1">Schema JSON</div>
                <textarea value={form.seo.schema_json} onChange={(e) => updateSeo('schema_json', e.target.value)} className="block w-full px-3 py-2 border rounded-md bg-white" rows={4} />
              </label>
            </section>
          )}

              {active > 1 && active < tabs.length - 1 && active !== 2 && active !== 4 && (
            <section className="rounded-xl border border-dashed border-slate-300 bg-white p-6">
              <p className="text-slate-600">Placeholder content for "{tabs[active]}" tab.</p>
              <p className="text-slate-500 text-sm mt-2">Implement fields as needed.</p>
            </section>
          )}

              {active === tabs.length - 1 && (
            <section>
              <h3 className="text-lg font-medium">Preview</h3>
              <div className="border border-slate-200 p-4 rounded-md bg-white mt-2">
                <h2 className="text-xl font-semibold">{form.name || 'Untitled product'}</h2>
                <p className="text-sm text-slate-600 mt-2">{form.description}</p>
                <p className="mt-3 font-semibold text-slate-800">${form.price || '0.00'}</p>
              </div>
            </section>
          )}

              <div className="flex flex-wrap items-center gap-3 pt-2">
            {active > 0 && (
              <button type="button" onClick={() => setActive((a) => a - 1)} className={secondaryButton}>
                Back
              </button>
            )}
            {active < tabs.length - 1 && (
              <button
                type="button"
                onClick={() => (active === 0 ? handleBasicNext() : setActive((a) => a + 1))}
                className={secondaryButton}
                disabled={savingDraft}
              >
                {active === 0 ? (savingDraft ? 'Saving...' : 'Save & Next') : 'Next'}
              </button>
            )}

            {active === tabs.length - 1 && (
              <button type="submit" disabled={loading} className={primaryButton}>
                {loading ? 'Saving...' : 'Create Product'}
              </button>
            )}
              </div>

              {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
              </div>
            </form>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <div className={`${softCard} p-5`}>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Workspace</p>
              <div className="mt-3 space-y-3">
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
                    <span>Completion</span>
                    <span className="font-semibold text-slate-900">{completion}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200">
                    <div className="h-2 rounded-full bg-slate-950 transition-all" style={{ width: `${completion}%` }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Active step</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{tabs[active]}</p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Media</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{mediaCount}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className={`${softCard} overflow-hidden`}>
              <div className="border-b border-slate-200 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Quick preview</p>
              </div>
              <div className="space-y-3 px-5 py-4">
                <div className="aspect-[16/10] overflow-hidden rounded-2xl bg-slate-100">
                  {form.images?.[0] ? (
                    form.images[0].media_type === 'VIDEO' ? (
                      <video src={form.images[0].media_url} className="h-full w-full object-cover" controls />
                    ) : (
                      <img src={form.images[0].thumbnail_url || form.images[0].media_url} alt={form.images[0].alt_text} className="h-full w-full object-cover" />
                    )
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-500">No media yet</div>
                  )}
                </div>
                <div>
                  <p className="text-lg font-semibold text-slate-950">{form.name || 'Untitled product'}</p>
                  <p className="mt-1 text-sm text-slate-600">{form.short_description || 'Add a clean product summary.'}</p>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm">
                  <span className="text-sm text-slate-600">Price</span>
                  <span className="text-sm font-semibold text-slate-950">{form.price ? `$${form.price}` : '$0.00'}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
