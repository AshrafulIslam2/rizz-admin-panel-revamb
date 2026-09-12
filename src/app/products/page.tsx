import Link from 'next/link'
import { Suspense } from 'react'
import AutoRefresh from '@/components/auto-refresh'
import ProductsFilters, { type FilterOption } from '@/components/products-filters'

type Product = {
  id: string | number
  name: string
  description?: string
  sku?: string
  price?: number
  stock_qty?: number
  status?: string
  is_published?: boolean
  category?: { name?: string; slug?: string } | null
  media?: { media_url: string; is_primary: boolean }[]
  variants?: { price: number; sale_price?: number | null; stock_qty?: number; reserved_qty?: number }[]
}

/**
 * A product is only "Live" when it is both ACTIVE and published.
 *
 * The badge used to be the hardcoded word "Live" on every card, so a draft
 * looked exactly like a published product — the same class of mistake as a
 * revenue figure that ignores order status.
 */
function isLive(p: Product): boolean {
  return String(p.status ?? 'ACTIVE').toUpperCase() === 'ACTIVE' && p.is_published !== false
}

/** Everything the search box looks through. */
function matchesSearch(p: Product, q: string): boolean {
  if (!q) return true
  const hay = [p.name, p.sku, p.description, p.category?.name].filter(Boolean).join(' ').toLowerCase()
  return hay.includes(q.toLowerCase())
}

const LOW_STOCK_THRESHOLD = 6

function cardPrice(p: Product): number {
  if (p.variants && p.variants.length > 0) {
    return Math.min(...p.variants.map((v) => v.sale_price ?? v.price))
  }
  return p.price ?? 0
}

/**
 * What can actually still be sold: stock on the shelf minus units already
 * held by confirmed or shipped orders.
 *
 * Raw stock_qty is the wrong number to headline — a variant showing 2 with
 * both pairs reserved is out of stock for the next customer.
 */
function totalStock(p: Product): number {
  if (p.variants && p.variants.length > 0) {
    return p.variants.reduce(
      (sum, v) => sum + Math.max(0, (v.stock_qty ?? 0) - (v.reserved_qty ?? 0)),
      0,
    )
  }
  return p.stock_qty ?? 0
}

/** Units spoken for but not yet dispatched off the books. */
function totalReserved(p: Product): number {
  if (!p.variants || p.variants.length === 0) return 0
  return p.variants.reduce((sum, v) => sum + (v.reserved_qty ?? 0), 0)
}

function cardImage(p: Product): string | null {
  if (!p.media || p.media.length === 0) return null
  return (p.media.find((m) => m.is_primary) ?? p.media[0]).media_url
}

const PAGE_SIZES = [12, 24, 48, 96]
const DEFAULT_PAGE_SIZE = 24

/** Read a positive integer out of a query string, falling back on nonsense. */
function intParam(v: string | string[] | undefined, fallback: number): number {
  const n = Number(Array.isArray(v) ? v[0] : v)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

/**
 * Paging lives in the URL rather than in client state.
 *
 * This page is a server component, so a page number in the query string keeps
 * it that way — and a link to page 3 stays a link to page 3 when it is
 * bookmarked or reloaded.
 */
export default async function ProductsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = (await searchParams) ?? {}
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3040/api'
  let products: Product[] = []
  try {
    const res = await fetch(`${baseUrl}/products`, { cache: 'no-store' })
    if (!res.ok) throw new Error(`Failed to fetch products: ${res.status}`)
    products = await res.json()
  } catch (err) {
    return (
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="rounded-2xl bg-white/80 backdrop-blur border border-white/60 shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Products</h1>
              <p className="text-sm text-slate-600 mt-1">Manage your catalog, pricing, and product details in one place.</p>
            </div>
            <Link href="/admin/products/new" className="inline-flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-full shadow hover:bg-slate-800">
              <span className="text-lg leading-none">+</span>
              Create Product
            </Link>
          </div>
          <div className="mt-6 text-sm text-red-600">Unable to load products. Please try again later.</div>
        </div>
      </main>
    )
  }

  // Categories offered in the dropdown come from the products themselves, so
  // the list can never offer a category that would return nothing.
  const categories: FilterOption[] = Array.from(
    new Map(
      products
        .filter((p) => p.category?.slug && p.category?.name)
        .map((p) => [p.category!.slug!, { value: p.category!.slug!, label: p.category!.name! }]),
    ).values(),
  ).sort((a, b) => a.label.localeCompare(b.label))

  const q = String(Array.isArray(sp.q) ? sp.q[0] : sp.q ?? '').trim()
  const categoryFilter = String(Array.isArray(sp.category) ? sp.category[0] : sp.category ?? 'all')
  const statusFilter = String(Array.isArray(sp.status) ? sp.status[0] : sp.status ?? 'all')
  const stockFilter = String(Array.isArray(sp.stock) ? sp.stock[0] : sp.stock ?? 'all')

  const filtered = products.filter((p) => {
    if (!matchesSearch(p, q)) return false
    if (categoryFilter !== 'all' && p.category?.slug !== categoryFilter) return false
    if (statusFilter === 'live' && !isLive(p)) return false
    if (statusFilter === 'draft' && isLive(p)) return false

    if (stockFilter !== 'all') {
      // Measured on sellable stock, not raw shelf count — reserved pairs are
      // already spoken for.
      const available = totalStock(p)
      if (stockFilter === 'out' && available > 0) return false
      if (stockFilter === 'in' && available <= 0) return false
      if (stockFilter === 'low' && (available <= 0 || available > LOW_STOCK_THRESHOLD)) return false
    }
    return true
  })

  const perPage = PAGE_SIZES.includes(intParam(sp.perPage, DEFAULT_PAGE_SIZE))
    ? intParam(sp.perPage, DEFAULT_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  // Clamped, so ?page=99 lands on the last real page instead of an empty grid.
  const page = Math.min(intParam(sp.page, 1), totalPages)
  const start = (page - 1) * perPage
  const pageItems = filtered.slice(start, start + perPage)

  /** Paging links must carry the filters, or page 2 would drop them. */
  const hrefFor = (pageNo: number, size = perPage) => {
    const qs = new URLSearchParams()
    if (q) qs.set('q', q)
    if (categoryFilter !== 'all') qs.set('category', categoryFilter)
    if (statusFilter !== 'all') qs.set('status', statusFilter)
    if (stockFilter !== 'all') qs.set('stock', stockFilter)
    qs.set('page', String(pageNo))
    qs.set('perPage', String(size))
    return `/products?${qs.toString()}`
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <AutoRefresh intervalMs={15000} />
      <div className="rounded-2xl bg-white/80 backdrop-blur border border-white/60 shadow-lg p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Products</h1>
            <p className="text-sm text-slate-600 mt-1">Manage your catalog, pricing, and product details in one place.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin/products/new" className="inline-flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-full shadow hover:bg-slate-800">
              <span className="text-lg leading-none">+</span>
              Create Product
            </Link>
          </div>
        </div>

        {/* useSearchParams needs a Suspense boundary in a server-rendered page. */}
        <div className="mt-5 border-t border-slate-200 pt-4">
          <Suspense fallback={<div className="h-10" />}>
            <ProductsFilters categories={categories} />
          </Suspense>
        </div>

        <div className="grid gap-4 mt-6 md:grid-cols-2">
          {pageItems.map((p: Product) => {
            const img = cardImage(p)
            const price = cardPrice(p)
            const stock = totalStock(p)
            const reserved = totalReserved(p)
            const isLowStock = stock <= LOW_STOCK_THRESHOLD
            const live = isLive(p)
            return (
              <div key={p.id} className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition">
                <div className="flex items-start gap-4">
                  {img ? (
                    <img src={img} alt={p.name} className="h-16 w-16 shrink-0 rounded-lg object-cover bg-slate-100" />
                  ) : (
                    <div className="h-16 w-16 shrink-0 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300 text-xs">No image</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-lg font-semibold text-slate-900">
                        <Link href={`/products/${p.id}`} className="hover:underline">
                          {p.name}
                        </Link>
                      </h2>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span
                          className={`rounded-full text-xs font-semibold px-3 py-1 ${
                            live ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {live ? 'Live' : 'Draft'}
                        </span>
                        {isLowStock && (
                          <span className="rounded-full bg-red-50 text-red-700 text-xs font-semibold px-3 py-1">
                            Low Stock ({stock}{reserved > 0 ? ` · ${reserved} reserved` : ""})
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 mt-1 line-clamp-2">{p.description}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-slate-500">SKU: {p.sku || 'N/A'}</span>
                  <span className="text-lg font-semibold text-slate-900">{price > 0 ? `৳${price.toLocaleString()}` : '—'}</span>
                </div>
              </div>
            )
          })}
        </div>

        {filtered.length === 0 ? (
          <p className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            {products.length === 0
              ? 'No products yet.'
              : `No products match these filters. ${products.length} product${products.length === 1 ? '' : 's'} in total.`}
          </p>
        ) : (
          <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              Showing <b>{start + 1}</b>–<b>{start + pageItems.length}</b> of <b>{filtered.length}</b>
              {filtered.length !== products.length && <> (filtered from {products.length})</>} products
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500">Per page</span>
                {PAGE_SIZES.map((size) => (
                  <Link
                    key={size}
                    href={hrefFor(1, size)}
                    className={`rounded-lg px-2 py-1 text-xs font-semibold transition ${
                      size === perPage ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {size}
                  </Link>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <Link
                    href={hrefFor(Math.max(1, page - 1))}
                    aria-disabled={page === 1}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                      page === 1
                        ? 'pointer-events-none border-slate-100 text-slate-300'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    ← Prev
                  </Link>

                  {/* A short window around the current page — a shop with 40
                      pages should not render 40 buttons. */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                    .map((n, i, arr) => (
                      <span key={n} className="flex items-center">
                        {i > 0 && arr[i - 1] !== n - 1 && <span className="px-1 text-xs text-slate-400">…</span>}
                        <Link
                          href={hrefFor(n)}
                          className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                            n === page ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {n}
                        </Link>
                      </span>
                    ))}

                  <Link
                    href={hrefFor(Math.min(totalPages, page + 1))}
                    aria-disabled={page === totalPages}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                      page === totalPages
                        ? 'pointer-events-none border-slate-100 text-slate-300'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Next →
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
