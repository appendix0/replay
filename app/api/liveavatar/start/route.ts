// Mints a sandbox LITE-mode LiveAvatar session token for the browser SDK.
// Sandbox sessions don't consume credits — used while we're testing.

const LIVEAVATAR_API = 'https://api.liveavatar.com'

export async function POST(request: Request) {
  const apiKey = process.env.LIVEAVATAR_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'LIVEAVATAR_API_KEY not configured' }, { status: 503 })
  }

  const { avatar_id } = (await request.json()) as { avatar_id?: string }
  if (!avatar_id) {
    return Response.json({ error: 'avatar_id is required' }, { status: 400 })
  }

  const res = await fetch(`${LIVEAVATAR_API}/v1/sessions/token`, {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      mode: 'LITE',
      avatar_id,
      is_sandbox: true,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    return Response.json({ error: `LiveAvatar token error: ${body}` }, { status: res.status })
  }

  const { data } = (await res.json()) as {
    data: { session_id: string; session_token: string }
  }
  return Response.json({ session_id: data.session_id, session_token: data.session_token })
}
