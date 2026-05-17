import Link from 'next/link'
import { notFound } from 'next/navigation'

type PageProps = {
  params: Promise<{ id: string }>
}

type ProductMedia = {
  id?: string | number
  media_type?: string
  media_url?: string
  thumbnail_url?: string
  title?: string
  alt_text?: string
}

type ProductVariant = {
  id?: string | number
  name?: string
  sku?: string
  price?: number
  compare_at_price?: number
  stock?: number
}

type Product = {
  id: string | number
  name?: string
  description?: string
  sku?: string
  price?: number
  status?: string
  category?: string
  categories?: Array<{ id?: string | number; name?: string } | string>
  variants?: ProductVariant[]
  images?: ProductMedia[]
  media?: ProductMedia[]
  product_media?: ProductMedia[]
  thumbnail_url?: string
  tags?: string[]
}

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

function formatPrice(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'N/A'
  return currency.format(value)
}

function resolveMedia(product: Product) {
  return product.images || product.media || product.product_media || []
}

export default async function ProductPage({ params }: PageProps) {
  const { id } = await params
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3040/api'

  const res = await fetch(`${baseUrl}/products/${id}`, { cache: 'no-store' })
  if (res.status === 404) notFound()
  if (!res.ok) {
    return (
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-red-600">Unable to load this product right now.</p>
          <Link href="/products" className="mt-4 inline-flex text-sm font-medium text-slate-900 underline">
            Back to products
          </Link>
        </div>
      </main>
    )
  }

  const product = (await res.json()) as Product
  const mediaItems = resolveMedia(product)
  const variants = product.variants || []
  const categories = product.categories || (product.category ? [product.category] : [])

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <Link href="/products" className="text-sm text-slate-500 hover:text-slate-900">
            ← Back to products
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{product.name || 'Product details'}</h1>
          <p className="mt-2 text-sm text-slate-600">ID: {product.id}</p>
        </div>
        <span className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white">
          {product.status || 'DRAFT'}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Overview</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{product.description || 'No description provided.'}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Price</p>
              <p className="mt-2 text-xl font-semibold text-slate-950">{formatPrice(product.price)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">SKU</p>
              <p className="mt-2 text-xl font-semibold text-slate-950">{product.sku || 'N/A'}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Categories</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {categories.length ? (
                  categories.map((category, index) => (
                    <span key={index} className="rounded-full bg-white px-3 py-1 text-sm text-slate-700 shadow-sm ring-1 ring-slate-200">
                      {typeof category === 'string' ? category : category.name || 'Unnamed category'}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-slate-500">No categories</span>
                )}
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Tags</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {product.tags?.length ? (
                  product.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-white px-3 py-1 text-sm text-slate-700 shadow-sm ring-1 ring-slate-200">
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-slate-500">No tags</span>
                )}
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-slate-950">Media</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {mediaItems.length ? (
                mediaItems.map((item, index) => (
                  <article key={item.id ?? `${item.media_url}-${index}`} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    <div className="aspect-[4/3] bg-slate-100">
                      {item.media_url ? (
                        <img src={item.thumbnail_url || item.media_url} alt={item.alt_text || item.title || product.name || 'Product media'} className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="p-4">
                      <p className="text-sm font-medium text-slate-950">{item.title || 'Untitled media'}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.media_type || 'MEDIA'}</p>
                    </div>
                  </article>
                ))
              ) : (
                <p className="text-sm text-slate-500">No media attached.</p>
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Variants</h2>
            <div className="mt-4 space-y-3">
              {variants.length ? (
                variants.map((variant, index) => (
                  <div key={variant.id ?? index} className="rounded-xl bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-slate-950">{variant.name || `Variant ${index + 1}`}</p>
                      <p className="font-semibold text-slate-950">{formatPrice(variant.price)}</p>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">SKU: {variant.sku || 'N/A'}</p>
                    <p className="mt-1 text-sm text-slate-600">Stock: {typeof variant.stock === 'number' ? variant.stock : 'N/A'}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No variants found for this product.</p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Quick Facts</h2>
            <dl className="mt-4 space-y-4 text-sm">
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
                <dt className="text-slate-500">Primary image</dt>
                <dd className="text-slate-900">{product.thumbnail_url ? 'Yes' : 'No'}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
                <dt className="text-slate-500">Media count</dt>
                <dd className="text-slate-900">{mediaItems.length}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-500">Variant count</dt>
                <dd className="text-slate-900">{variants.length}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </main>
  )
}