export const runtime = 'nodejs'

export async function POST(request: Request) {
  const apiKey = process.env.MGBB_API_KEY || process.env.IMGBB_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'MGBB_API_KEY is not set' }, { status: 500 })
  }

  const formData = await request.formData()
  const file = formData.get('file')

  if (!(file instanceof File)) {
    return Response.json({ error: 'file is required' }, { status: 400 })
  }

  if (!file.type.startsWith('image/')) {
    return Response.json({ error: 'Only image files are supported' }, { status: 400 })
  }

  const uploadForm = new FormData()
  uploadForm.append('image', file, file.name)

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: 'POST',
    body: uploadForm,
  })

  const json = await response.json()
  if (!response.ok || json?.success === false) {
    return Response.json(
      {
        error: json?.error?.message || json?.error || 'Image upload failed',
      },
      { status: response.status || 500 },
    )
  }

  const data = json?.data ?? {}
  const mediaUrl = data?.url || data?.display_url || data?.thumb?.url || ''
  const thumbnailUrl = data?.thumb?.url || data?.display_url || mediaUrl

  return Response.json({
    media_type: 'IMAGE',
    media_url: mediaUrl,
    thumbnail_url: thumbnailUrl,
    alt_text: file.name,
    title: file.name,
  })
}
