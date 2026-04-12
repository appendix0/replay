const ELEVENLABS_API = 'https://api.elevenlabs.io/v1'

// Proxy ElevenLabs TTS — keeps the API key server-side
export async function POST(request: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    return new Response('ElevenLabs API key not configured', { status: 503 })
  }

  const { text, voice_id } = await request.json() as { text: string; voice_id: string }

  if (!text?.trim() || !voice_id) {
    return new Response('text and voice_id are required', { status: 400 })
  }

  const res = await fetch(`${ELEVENLABS_API}/text-to-speech/${voice_id}/stream`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: text.slice(0, 1000), // cap to avoid runaway tokens
      model_id: 'eleven_multilingual_v2', // best Korean support
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.8,
        speed: 1.0,
      },
    }),
  })

  if (!res.ok) {
    const msg = await res.text()
    return new Response(`ElevenLabs error: ${msg}`, { status: res.status })
  }

  // Stream audio directly to the client
  return new Response(res.body, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-store',
    },
  })
}
