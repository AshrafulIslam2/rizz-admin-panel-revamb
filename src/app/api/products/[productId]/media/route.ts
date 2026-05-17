export const runtime = 'nodejs'

type MediaPayload = {
  media_type?: string
  media_url?: string
  thumbnail_url?: string
  alt_text?: string
  title?: string
  sort_order?: number
  is_primary?: boolean
  is_featured?: boolean
  status?: string
  variant_id?: string | null
}

export async function POST(request: Request, context: { params: Promise<{ productId: string }> }) {
  const { productId } = await context.params
  if (!productId) {
    return Response.json({ error: 'productId is required' }, { status: 400 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3040/api'
  const body = (await request.json()) as MediaPayload

  if (!body.media_url) {
    return Response.json({ error: 'media_url is required' }, { status: 400 })
  }

  const response = await fetch(`${baseUrl}/products/${productId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    return Response.json(
      {
        error: data?.error || data?.message || 'Failed to save product media',
        details: data,
      },
      { status: response.status || 500 },
    )
  }

  return Response.json(data)
}