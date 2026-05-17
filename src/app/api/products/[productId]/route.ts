export const runtime = 'nodejs'

type RouteContext = {
  params: Promise<{ productId: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  const { productId } = await context.params

  if (!productId) {
    return Response.json({ error: 'productId is required' }, { status: 400 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3040/api'
  const response = await fetch(`${baseUrl}/products/${productId}`, {
    method: 'GET',
    cache: 'no-store',
  })

  const contentType = response.headers.get('content-type') || ''
  const data = contentType.includes('application/json') ? await response.json() : await response.text()

  if (!response.ok) {
    return Response.json(
      {
        error: typeof data === 'string' ? data : data?.error || 'Failed to fetch product',
      },
      { status: response.status },
    )
  }

  return Response.json(data)
}