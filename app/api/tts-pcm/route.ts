// ElevenLabs → base64 PCM 24kHz, the format LiveAvatar's repeatAudio() expects.
// Separate from /api/tts (MP3 streaming for the legacy cartoon avatar).

const ELEVENLABS_API = 'https://api.elevenlabs.io/v1'

export async function POST(request: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'ElevenLabs API key not configured' }, { status: 503 })
  }

  const { text, voice_id } = (await request.json()) as { text: string; voice_id: string }
  if (!text?.trim() || !voice_id) {
    return Response.json({ error: 'text and voice_id are required' }, { status: 400 })
  }

  const res = await fetch(
    `${ELEVENLABS_API}/text-to-speech/${voice_id}/with-timestamps?output_format=pcm_24000`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text.slice(0, 1000),
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.8, speed: 1.0 },
      }),
    },
  )

  if (!res.ok) {
    const msg = await res.text()
    return Response.json({ error: `ElevenLabs error: ${msg}` }, { status: res.status })
  }

  const data = (await res.json()) as { audio_base64: string }
  return Response.json({ audio_base64: data.audio_base64 })
}
