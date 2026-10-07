import { Session, ASRRequest } from 'fish-audio-sdk'
import { NextRequest, NextResponse } from 'next/server'

let _session: Session | null = null
function getSession() {
  if (!_session) _session = new Session(process.env.FISH_AUDIO_API_KEY!)
  return _session
}

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const audio = form.get('audio') as File | null
  if (!audio) {
    return NextResponse.json({ error: 'missing audio field' }, { status: 400 })
  }

  const buffer = Buffer.from(await audio.arrayBuffer())
  const result = await getSession().asr(new ASRRequest(buffer, 'en', true))

  return NextResponse.json({ transcript: result.text })
}
