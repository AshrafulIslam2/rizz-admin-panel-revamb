import Link from 'next/link'

type Product = {
  id: string | number
  name: string
  description?: string
  sku?: string
  price?: number
}

export default async function ProductsPage() {
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

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <div className="rounded-2xl bg-white/80 backdrop-blur border border-white/60 shadow-lg p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Products</h1>
            <p className="text-sm text-slate-600 mt-1">Manage your catalog, pricing, and product details in one place.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 text-sm rounded-full border border-slate-200 bg-white hover:bg-slate-50">Filter</button>
            <Link href="/admin/products/new" className="inline-flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-full shadow hover:bg-slate-800">
              <span className="text-lg leading-none">+</span>
              Create Product
            </Link>
          </div>
        </div>

        <div className="grid gap-4 mt-6 md:grid-cols-2">
          {products.map((p: Product) => (
            <div key={p.id} className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    <Link href={`/products/${p.id}`} className="hover:underline">
                      {p.name}
                    </Link>
                  </h2>
                  <p className="text-sm text-slate-600 mt-2 line-clamp-2">{p.description}</p>
                </div>
                <span className="rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1">Live</span>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-slate-500">SKU: {p.sku || 'N/A'}</span>
                <span className="text-lg font-semibold text-slate-900">${p.price}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
