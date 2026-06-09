export const runtime = 'nodejs'

type RouteContext = {
  params: Promise<{ productId: string }>
}

type JsonRecord = Record<string, any>

function readContent(data: unknown) {
  if (data === null || data === undefined) return null
  if (typeof data === 'string') return data
  return data
}

export async function PATCH(request: Request, context: RouteContext) {
  const { productId } = await context.params

  if (!productId) {
    return Response.json({ error: 'productId is required' }, { status: 400 })
  }

  let body: JsonRecord
  try {
    body = (await request.json()) as JsonRecord
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3040/api'
  const response = await fetch(`${baseUrl}/products/${productId}/basic-info`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const contentType = response.headers.get('content-type') || ''
  const data = contentType.includes('application/json') ? await response.json() : await response.text()

  if (!response.ok) {
    return Response.json(
      {
        error: typeof data === 'string' ? data : data?.error || 'Failed to update basic product info',
      },
      { status: response.status },
    )
  }

  return Response.json(readContent(data))
}