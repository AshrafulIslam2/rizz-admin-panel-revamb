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
      setSavingDraft(false)
      setActive(1)
    } catch (err: any) {
      setError(err.message || 'Network error')
      setSavingDraft(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="rounded-2xl bg-white/80 backdrop-blur border border-white/60 shadow-xl p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Create Product</h1>
            <p className="text-sm text-slate-600 mt-1">Fill in the required fields and publish when ready.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-slate-500">Draft</span>
            <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />
          </div>
        </div>

        <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
          {tabs.map((t, i) => (
            <button
              key={t}
              onClick={() => setActive(i)}
              className={`px-4 py-2 rounded-full whitespace-nowrap text-sm border transition ${
                i === active
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {active === 0 && (
            <section className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <div className="text-sm font-medium mb-1">SKU</div>
                  <input value={form.sku} onChange={(e) => update('sku', e.target.value)} className="block w-full px-3 py-2 border rounded-md bg-white" />
                </label>
                <label className="block">
                  <div className="text-sm font-medium mb-1">Name</div>
                  <input
                    value={form.name}
                    onChange={(e) => update('name', e.target.value)}
                    required
                    className="block w-full px-3 py-2 border rounded-md bg-white"
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

          {active > 1 && active < tabs.length - 1 && active !== 4 && (
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

          <div className="flex items-center gap-3 mt-4">
            {active > 0 && (
              <button type="button" onClick={() => setActive((a) => a - 1)} className="px-3 py-2 rounded-md border">
                Back
              </button>
            )}
            {active < tabs.length - 1 && (
              <button
                type="button"
                onClick={() => (active === 0 ? handleBasicNext() : setActive((a) => a + 1))}
                className="px-3 py-2 rounded-md bg-slate-100"
                disabled={savingDraft}
              >
                {active === 0 ? (savingDraft ? 'Saving...' : 'Save & Next') : 'Next'}
              </button>
            )}

            {active === tabs.length - 1 && (
              <button type="submit" disabled={loading} className="px-4 py-2 rounded-md bg-slate-900 text-white">
                {loading ? 'Saving...' : 'Create Product'}
              </button>
            )}
          </div>

          {error && <p className="text-red-600 mt-3">{error}</p>}
        </form>
      </div>
    </div>
  )
}
