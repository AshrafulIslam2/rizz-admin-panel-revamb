import Link from 'next/link'
import { notFound } from 'next/navigation'
import ProductTabs from './ProductTabs.client'

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
  is_default?: boolean
  compare_at_price?: number
  stock?: number
}

type Product = {
  id: string | number
  name?: string
  description?: string
  short_description?: string
  sku?: string
  price?: number
  status?: string
  category?: string
  category_id?: string
  categories?: Array<{ id?: string | number; name?: string } | string>
  variants?: ProductVariant[]
  images?: ProductMedia[]
  media?: ProductMedia[]
  product_media?: ProductMedia[]
  thumbnail_url?: string
  tags?: string[]
  key_features?: string[]
  materials?: string[]
  use_cases?: string[]
  benefits?: string[]
  brand_id?: string
  gender?: string
  age_group?: string
  material?: string
  tax_class?: string
  weight?: number | null
  length?: number | null
  width?: number | null
  height?: number | null
  seo?: any
  translations?: any[]
  faqs?: any[]
  reviews?: any[]
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
  if (Array.isArray(product.media) && product.media.length) return { items: product.media, source: 'media' }
  if (Array.isArray(product.images) && product.images.length) return { items: product.images, source: 'images' }
  if (Array.isArray(product.product_media) && product.product_media.length) return { items: product.product_media, source: 'product_media' }
  return { items: [], source: 'none' }
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

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/products" className="text-sm text-slate-500 hover:text-slate-900">← Back to products</Link>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${product.status === "active" ? "bg-teal-100 text-teal-800" : "bg-slate-100 text-slate-600"}`}>
          {product.status ?? "draft"}
        </span>
      </div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">{product.name ?? "Untitled Product"}</h1>
        {product.sku && <p className="text-sm text-slate-500 mt-1">SKU: {product.sku}</p>}
      </div>

      <ProductTabs productId={String(product.id)} initialData={product as Record<string, unknown>} />
    </main>
  )
}
