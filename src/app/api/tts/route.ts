import { Session, TTSRequest } from 'fish-audio-sdk'
import { NextRequest } from 'next/server'

let _session: Session | null = null
function getSession() {
  if (!_session) _session = new Session(process.env.FISH_AUDIO_API_KEY!)
  return _session
}

export async function POST(req: NextRequest) {
  const { text } = await req.json()
  if (!text || typeof text !== 'string') {
    return new Response(JSON.stringify({ error: 'missing text' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const ttsRequest = new TTSRequest(text, {
    format: 'mp3',
    latency: 'balanced',
    referenceId: process.env.FISH_AUDIO_VOICE_ID || undefined,
  })

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of getSession().tts(ttsRequest)) {
          controller.enqueue(chunk)
        }
        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'audio/mpeg' },
  })
}
