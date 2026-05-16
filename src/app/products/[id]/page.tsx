import { notFound } from 'next/navigation'
import Link from 'next/link'
import products from '../../../../data/products.json'

type Props = {
  params: { id: string }
}

export default function ProductPage({ params }: Props) {
  const product = (products as any[]).find(p => p.id === params.id)
  if (!product) return notFound()

  return (
    <main style={{padding: 24}}>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <p style={{fontWeight: 600}}>${product.price}</p>
      <p>
        <Link href="/products">← Back to products</Link>
      </p>
    </main>
  )
}
