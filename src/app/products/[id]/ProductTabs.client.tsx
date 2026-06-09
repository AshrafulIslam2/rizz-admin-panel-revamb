"use client"

import React, { useState } from 'react'
import BasicInfoEditor from './BasicInfoEditor.client'

type Props = {
  product: any
}

const tabs = [
  { key: 'basic', label: 'Basic' },
  { key: 'variant', label: 'Variant' },
  { key: 'media', label: 'Media' },
  { key: 'seo', label: 'SEO' },
  { key: 'transaction', label: 'Transaction' },
  { key: 'faq', label: 'FAQ' },
  { key: 'review', label: 'Review' },
]

function formatPrice(value?: number) {
  try {
    const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
    if (typeof value !== 'number' || Number.isNaN(value)) return 'N/A'
    return currency.format(value)
  } catch {
    return 'N/A'
  }
}

export default function ProductTabs({ product }: Props) {
  const [active, setActive] = useState<string>('basic')
  const [showJson, setShowJson] = useState<boolean>(false)
  const variants = product?.variants || []
  const media = product?.media || product?.images || product?.product_media || []

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">{product?.name || 'Product'}</h2>
          <p className="text-sm text-slate-500">ID: {product?.id}</p>
        </div>
        <div className="text-sm text-slate-700">Status: {product?.status || 'DRAFT'}</div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <nav className="mb-4 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={`px-3 py-1 rounded-md text-sm font-medium ${active === t.key ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-700'}`}>
              {t.label}
            </button>
          ))}
        </nav>

        <div>
          {active === 'basic' && (
            <section className="space-y-4">
              <BasicInfoEditor product={product} productId={product?.id} />

              <div className="mt-4">
                <button
                  onClick={() => setShowJson((s) => !s)}
                  className="inline-flex items-center gap-2 rounded-md bg-slate-50 px-3 py-1 text-sm font-medium text-slate-700"
                >
                  {showJson ? 'Hide raw JSON' : 'Show raw JSON'}
                </button>

                {showJson && (
                  <pre className="mt-3 p-3 bg-slate-900 text-white rounded-md overflow-auto text-xs">{JSON.stringify(product, null, 2)}</pre>
                )}
              </div>
            </section>
          )}

          {active === 'variant' && (
            <section className="space-y-4">
              {variants.length ? (
                <div className="grid gap-3">
                  {variants.map((v: any, i: number) => (
                    <div key={v.id ?? i} className="rounded-xl bg-slate-50 p-4">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{v.name || `Variant ${i + 1}`}</div>
                        <div className="font-semibold">{formatPrice(v.price)}</div>
                      </div>
                      <div className="text-sm text-slate-600">SKU: {v.sku || 'N/A'}</div>
                      <div className="text-sm text-slate-600">Stock: {typeof v.stock === 'number' ? v.stock : 'N/A'}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No variants available.</p>
              )}
            </section>
          )}

          {active === 'media' && (
            <section className="space-y-4">
              <p className="text-sm text-slate-500">Source: {product?.media ? 'media' : product?.images ? 'images' : product?.product_media ? 'product_media' : 'none'}</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {media.length ? (
                  media.map((item: any, idx: number) => (
                    <article key={item.id ?? `${item.media_url ?? idx}` } className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                      <div className="aspect-[4/3] bg-slate-100">
                        {item.media_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.thumbnail_url || item.media_url} alt={item.alt_text || item.title || product?.name || 'Product media'} className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div className="p-3">
                        <div className="text-sm font-medium">{item.title || 'Untitled'}</div>
                        <div className="text-xs text-slate-500">{item.media_type || 'MEDIA'}</div>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No media attached.</p>
                )}
              </div>
            </section>
          )}

          {active === 'seo' && (
            <section className="space-y-4">
              {product?.seo ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Meta title</p>
                    <p className="mt-1 text-sm text-slate-700">{product.seo.meta_title || '—'}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Meta description</p>
                    <p className="mt-1 text-sm text-slate-700">{product.seo.meta_description || '—'}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">No SEO data.</p>
              )}
            </section>
          )}

          {active === 'transaction' && (
            <section className="space-y-4">
              <p className="text-sm text-slate-500">Transaction history is not available in the current dataset.</p>
            </section>
          )}

          {active === 'faq' && (
            <section className="space-y-4">
              {Array.isArray(product?.faqs) && product.faqs.length ? (
                product.faqs.map((f: any, i: number) => (
                  <div key={i} className="rounded-xl bg-slate-50 p-3">
                    <div className="text-sm font-medium">{f.question || 'FAQ'}</div>
                    <div className="text-xs text-slate-600">{f.answer || JSON.stringify(f)}</div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No FAQs.</p>
              )}
            </section>
          )}

          {active === 'review' && (
            <section className="space-y-4">
              {Array.isArray(product?.reviews) && product.reviews.length ? (
                product.reviews.map((r: any, i: number) => (
                  <div key={i} className="rounded-xl bg-slate-50 p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{r.reviewer || r.author || `Reviewer ${i + 1}`}</div>
                      <div className="text-xs text-slate-600">Rating: {r.rating ?? '—'}</div>
                    </div>
                    <div className="text-sm text-slate-600 mt-2">{r.comment || JSON.stringify(r)}</div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No reviews.</p>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
