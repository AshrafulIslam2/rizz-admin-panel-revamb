"use client"

import React, { useState } from 'react'
import { useEffect } from 'react'

export const ProductStatus = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED',
} as const

type Props = {
  product: any
  productId: string | number
}

function toArrayInput(value: any) {
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'string') return value
  return ''
}

function parseArrayInput(value: string) {
  return value.split(',').map((s) => s.trim()).filter(Boolean)
}

export default function BasicInfoEditor({ product, productId }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<any>(() => ({
    sku: product.sku || '',
    name: product.name || '',
    slug: product.slug || '',
    short_description: product.short_description || '',
    description: product.description || '',
    key_features: toArrayInput(product.key_features || []),
    materials: toArrayInput(product.materials || []),
    use_cases: toArrayInput(product.use_cases || []),
    benefits: toArrayInput(product.benefits || []),
    brand_id: product.brand_id || '',
    category_id: product.category_id || '',
    status: product.status || '',
    is_featured: !!product.is_featured,
    is_published: !!product.is_published,
    tags: toArrayInput(product.tags || []),
    gender: product.gender || '',
    age_group: product.age_group || '',
    material: product.material || '',
    tax_class: product.tax_class || '',
    specifications: product.specifications ? (typeof product.specifications === 'string' ? product.specifications : JSON.stringify(product.specifications, null, 2)) : '',
    how_to_use: product.how_to_use || '',
    problem_solved: product.problem_solved || '',
    weight: product.weight ?? '',
    length: product.length ?? '',
    width: product.width ?? '',
    height: product.height ?? '',
  }))
  const [categoryName, setCategoryName] = useState<string | null>(null)
  const [categoryLoading, setCategoryLoading] = useState(false)
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [categoriesList, setCategoriesList] = useState<Array<any>>([])
  const [categoriesLoading, setCategoriesLoading] = useState(false)
  const [categoriesError, setCategoriesError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function fetchCategoryName(id: string) {
      if (!id) {
        setCategoryName(null)
        setCategoryError(null)
        return
      }
      setCategoryLoading(true)
      setCategoryError(null)
      try {
        const base = process.env.NEXT_PUBLIC_API_URL || ''
        const url = base ? `${base}/categories/${id}` : `/api/categories/${id}`
        const res = await fetch(url)
        if (!res.ok) throw new Error('Not found')
        const data = await res.json()
        if (cancelled) return
        // try common fields name/title
        const name = data.name ?? data.title ?? data.displayName ?? null
        setCategoryName(name)
      } catch (err: any) {
        if (cancelled) return
        setCategoryName(null)
        setCategoryError(err?.message || 'Unable to load')
      } finally {
        if (!cancelled) setCategoryLoading(false)
      }
    }

    fetchCategoryName(String(form.category_id || product.category_id || ''))
    return () => { cancelled = true }
  }, [form.category_id, product.category_id])

  useEffect(() => {
    let cancelled = false
    async function fetchCategories() {
      if (!isEditing) return
      setCategoriesLoading(true)
      setCategoriesError(null)
      try {
        const base = process.env.NEXT_PUBLIC_API_URL || ''
        const url = base ? `${base}/categories` : `/api/categories`
        const res = await fetch(url)
        if (!res.ok) throw new Error('Unable to fetch categories')
        const data = await res.json()
        if (cancelled) return
        setCategoriesList(Array.isArray(data) ? data : [])
      } catch (err: any) {
        if (cancelled) return
        setCategoriesError(err?.message || 'Unable to load')
        setCategoriesList([])
      } finally {
        if (!cancelled) setCategoriesLoading(false)
      }
    }

    fetchCategories()
    return () => { cancelled = true }
  }, [isEditing])

  function updateField<K extends string>(key: K, value: any) {
    setForm((f: any) => ({ ...f, [key]: value }))
  }

  function parseJsonField(value: string) {
    if (!value) return null
    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const payload: any = {}

      function setIfProvided(key: string, value: any) {
        if (value !== undefined) payload[key] = value
      }

      setIfProvided('sku', form.sku || undefined)
      setIfProvided('name', form.name || undefined)
      setIfProvided('slug', form.slug || undefined)
      setIfProvided('short_description', form.short_description || undefined)
      setIfProvided('description', form.description || undefined)
      setIfProvided('key_features', parseArrayInput(form.key_features).length ? parseArrayInput(form.key_features) : undefined)
      setIfProvided('materials', parseArrayInput(form.materials).length ? parseArrayInput(form.materials) : undefined)

      // specifications: accept valid JSON object/array, `null` to clear, or omit when empty
      const rawSpecs = (form.specifications || '').trim()
      if (rawSpecs === '') {
        // omit -> keep current value
      } else if (rawSpecs.toLowerCase() === 'null') {
        payload.specifications = null
      } else {
        try {
          const parsed = JSON.parse(rawSpecs)
          if (typeof parsed === 'object' && parsed !== null) {
            payload.specifications = parsed
          } else {
            alert('`specifications` must be a JSON object/array or `null` to clear')
            setSaving(false)
            return
          }
        } catch {
          alert('`specifications` must be valid JSON (object or array) or the literal `null`')
          setSaving(false)
          return
        }
      }

      setIfProvided('use_cases', parseArrayInput(form.use_cases).length ? parseArrayInput(form.use_cases) : undefined)
      setIfProvided('how_to_use', form.how_to_use === '' ? undefined : (form.how_to_use || null))
      setIfProvided('benefits', parseArrayInput(form.benefits).length ? parseArrayInput(form.benefits) : undefined)
      setIfProvided('problem_solved', form.problem_solved === '' ? undefined : (form.problem_solved || null))
      setIfProvided('brand_id', form.brand_id || undefined)
      setIfProvided('category_id', form.category_id || undefined)
      setIfProvided('status', form.status || undefined)
      setIfProvided('is_featured', typeof form.is_featured === 'boolean' ? !!form.is_featured : undefined)
      setIfProvided('is_published', typeof form.is_published === 'boolean' ? !!form.is_published : undefined)
      setIfProvided('tags', parseArrayInput(form.tags).length ? parseArrayInput(form.tags) : undefined)
      setIfProvided('gender', form.gender || undefined)
      setIfProvided('age_group', form.age_group || undefined)
      setIfProvided('material', form.material || undefined)
      setIfProvided('tax_class', form.tax_class || undefined)
      setIfProvided('weight', form.weight === '' ? undefined : (form.weight === null ? null : Number(form.weight)))
      setIfProvided('length', form.length === '' ? undefined : (form.length === null ? null : Number(form.length)))
      setIfProvided('width', form.width === '' ? undefined : (form.width === null ? null : Number(form.width)))
      setIfProvided('height', form.height === '' ? undefined : (form.height === null ? null : Number(form.height)))

      const base = process.env.NEXT_PUBLIC_API_URL || ''
      const url = base ? `${base.replace(/\/$/, '')}/products/${productId}/basic-info` : `/api/products/${productId}/basic-info`

      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error('Failed to save')
      const updated = await res.json()
      // update local form with server response (best-effort)
      setForm((f: any) => ({
        ...f,
        sku: updated.sku ?? f.sku,
        name: updated.name ?? f.name,
        slug: updated.slug ?? f.slug,
      }))
      setIsEditing(false)
    } catch (err) {
      // minimal error handling — you can expand this
      // console.error(err)
      alert('Unable to save product. Check console for details.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-end">
        <div>
          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-md bg-slate-900 px-3 py-1 text-sm font-medium text-white"
            >
              Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-md bg-white border px-3 py-1 text-sm font-medium text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-md bg-slate-900 px-3 py-1 text-sm font-medium text-white"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </div>
      </div>

      {!isEditing ? (
        <div className="mt-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">ID</p>
              <p className="text-sm text-slate-900">{productId ?? 'N/A'}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">SKU</p>
              <p className="text-sm text-slate-900">{form.sku || '—'}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Slug</p>
              <p className="text-sm text-slate-900">{form.slug || '—'}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Status</p>
              <p className="text-sm text-slate-900">{form.status || '—'}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Featured</p>
              <p className="text-sm text-slate-900">{typeof form.is_featured === 'boolean' ? String(form.is_featured) : '—'}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Published</p>
              <p className="text-sm text-slate-900">{typeof form.is_published === 'boolean' ? String(form.is_published) : '—'}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 sm:col-span-2">
              <p className="text-xs text-slate-500">Tags</p>
              <p className="text-sm text-slate-900">{form.tags ? parseArrayInput(form.tags).join(', ') : '—'}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Short description</p>
              <p className="mt-1 text-sm text-slate-700">{form.short_description || '—'}</p>
            </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Description</p>
            <p className="mt-1 text-sm text-slate-700">{form.description || '—'}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Key features</p>
            <div className="mt-1 text-sm text-slate-700">
              {form.key_features ? <ul className="list-disc ml-5">{parseArrayInput(form.key_features).map((k) => <li key={k}>{k}</li>)}</ul> : <span>—</span>}
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Materials</p>
            <div className="mt-1 text-sm text-slate-700">
              {form.materials ? <ul className="list-disc ml-5">{parseArrayInput(form.materials).map((m) => <li key={m}>{m}</li>)}</ul> : <span>—</span>}
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Use cases</p>
            <div className="mt-1 text-sm text-slate-700">
              {form.use_cases ? <ul className="list-disc ml-5">{parseArrayInput(form.use_cases).map((u) => <li key={u}>{u}</li>)}</ul> : <span>—</span>}
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Benefits</p>
            <div className="mt-1 text-sm text-slate-700">
              {form.benefits ? <ul className="list-disc ml-5">{parseArrayInput(form.benefits).map((b) => <li key={b}>{b}</li>)}</ul> : <span>—</span>}
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Brand ID</p>
            <p className="mt-1 text-sm text-slate-700">{form.brand_id || '—'}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Category ID</p>
            <p className="mt-1 text-sm text-slate-700">
              {categoryLoading ? 'Loading…' : categoryName ? categoryName : (form.category_id || '—')}
              {categoryError ? <span className="ml-2 text-xs text-red-600">({categoryError})</span> : null}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Gender</p>
            <p className="mt-1 text-sm text-slate-700">{form.gender || '—'}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Age group</p>
            <p className="mt-1 text-sm text-slate-700">{form.age_group || '—'}</p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Material</p>
            <p className="mt-1 text-sm text-slate-700">{form.material || '—'}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Tax class</p>
            <p className="mt-1 text-sm text-slate-700">{form.tax_class || '—'}</p>
          </div>
        </div>
        </div>
      ) : (
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-500">SKU</label>
            <input className="mt-1 w-full rounded-md border px-3 py-2" value={form.sku} onChange={(e) => updateField('sku', e.target.value)} />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-500">Name</label>
            <input className="mt-1 w-full rounded-md border px-3 py-2" value={form.name} onChange={(e) => updateField('name', e.target.value)} />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-500">Slug</label>
            <input className="mt-1 w-full rounded-md border px-3 py-2" value={form.slug} onChange={(e) => updateField('slug', e.target.value)} />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-500">Status</label>
            <select className="mt-1 w-full rounded-md border px-3 py-2" value={form.status} onChange={(e) => updateField('status', e.target.value)}>
              <option value="">-- Select status --</option>
              {Object.values(ProductStatus).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs uppercase tracking-wide text-slate-500">Featured</label>
            <input type="checkbox" className="mt-1" checked={!!form.is_featured} onChange={(e) => updateField('is_featured', e.target.checked)} />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs uppercase tracking-wide text-slate-500">Published</label>
            <input type="checkbox" className="mt-1" checked={!!form.is_published} onChange={(e) => updateField('is_published', e.target.checked)} />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-500">Tags (comma separated)</label>
            <input className="mt-1 w-full rounded-md border px-3 py-2" value={form.tags} onChange={(e) => updateField('tags', e.target.value)} />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-500">Short description</label>
            <textarea className="mt-1 w-full rounded-md border px-3 py-2" value={form.short_description} onChange={(e) => updateField('short_description', e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs uppercase tracking-wide text-slate-500">Description</label>
            <textarea className="mt-1 w-full rounded-md border px-3 py-2" value={form.description} onChange={(e) => updateField('description', e.target.value)} />
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs uppercase tracking-wide text-slate-500">How to use (optional)</label>
            <textarea className="mt-1 w-full rounded-md border px-3 py-2" value={form.how_to_use} onChange={(e) => updateField('how_to_use', e.target.value)} />
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs uppercase tracking-wide text-slate-500">Problem solved (optional)</label>
            <textarea className="mt-1 w-full rounded-md border px-3 py-2" value={form.problem_solved} onChange={(e) => updateField('problem_solved', e.target.value)} />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-slate-500">Weight</label>
            <input type="number" step="any" className="mt-1 w-full rounded-md border px-3 py-2" value={form.weight} onChange={(e) => updateField('weight', e.target.value)} />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-500">Length</label>
            <input type="number" step="any" className="mt-1 w-full rounded-md border px-3 py-2" value={form.length} onChange={(e) => updateField('length', e.target.value)} />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-500">Width</label>
            <input type="number" step="any" className="mt-1 w-full rounded-md border px-3 py-2" value={form.width} onChange={(e) => updateField('width', e.target.value)} />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-500">Height</label>
            <input type="number" step="any" className="mt-1 w-full rounded-md border px-3 py-2" value={form.height} onChange={(e) => updateField('height', e.target.value)} />
          </div>

          

          <div className="sm:col-span-2">
            <label className="text-xs uppercase tracking-wide text-slate-500">Specifications (optional, JSON text)</label>
            <textarea className="mt-1 w-full rounded-md border px-3 py-2 font-mono text-xs" rows={6} value={form.specifications} onChange={(e) => updateField('specifications', e.target.value)} />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-slate-500">Key features (comma separated)</label>
            <input className="mt-1 w-full rounded-md border px-3 py-2" value={form.key_features} onChange={(e) => updateField('key_features', e.target.value)} />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-500">Materials (comma separated)</label>
            <input className="mt-1 w-full rounded-md border px-3 py-2" value={form.materials} onChange={(e) => updateField('materials', e.target.value)} />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-500">Use cases (comma separated)</label>
            <input className="mt-1 w-full rounded-md border px-3 py-2" value={form.use_cases} onChange={(e) => updateField('use_cases', e.target.value)} />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-500">Benefits (comma separated)</label>
            <input className="mt-1 w-full rounded-md border px-3 py-2" value={form.benefits} onChange={(e) => updateField('benefits', e.target.value)} />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-slate-500">Brand ID</label>
            <input className="mt-1 w-full rounded-md border px-3 py-2" value={form.brand_id} onChange={(e) => updateField('brand_id', e.target.value)} />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-500">Category</label>
            {isEditing ? (
              <div>
                {categoriesLoading ? (
                  <div className="mt-1 text-sm text-slate-500">Loading categories…</div>
                ) : categoriesError ? (
                  <div className="mt-1 text-sm text-red-600">{categoriesError}</div>
                ) : (
                  <select
                    className="mt-1 w-full rounded-md border px-3 py-2"
                    value={form.category_id || product.category_id || ''}
                    onChange={(e) => updateField('category_id', e.target.value)}
                  >
                    <option value="">-- Select category --</option>
                    {categoriesList.map((c) => <option key={c.id ?? c._id ?? c.value} value={c.id ?? c._id ?? c.value}>{c.name ?? c.title ?? c.displayName ?? String(c.id ?? c._id ?? c.value)}</option>)}
                  </select>
                )}
                <p className="mt-1 text-xs text-slate-500">{categoryLoading ? 'Loading category name…' : categoryName ? `Current: ${categoryName}` : 'Category name not available'}</p>
              </div>
            ) : (
              <p className="mt-1 text-sm text-slate-700">
                {categoryLoading ? 'Loading…' : categoryName ? categoryName : (form.category_id || '—')}
                {categoryError ? <span className="ml-2 text-xs text-red-600">({categoryError})</span> : null}
              </p>
            )}
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-slate-500">Gender</label>
            <input className="mt-1 w-full rounded-md border px-3 py-2" value={form.gender} onChange={(e) => updateField('gender', e.target.value)} />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-500">Age group</label>
            <input className="mt-1 w-full rounded-md border px-3 py-2" value={form.age_group} onChange={(e) => updateField('age_group', e.target.value)} />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-slate-500">Material</label>
            <input className="mt-1 w-full rounded-md border px-3 py-2" value={form.material} onChange={(e) => updateField('material', e.target.value)} />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-500">Tax class</label>
            <input className="mt-1 w-full rounded-md border px-3 py-2" value={form.tax_class} onChange={(e) => updateField('tax_class', e.target.value)} />
          </div>
        </div>
      )}  
      
          
    </div>
  )
} 

