'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { GameState, Cell, TurnRequest, FoundRule } from '@/types/game'
import { CORE_RULES, EXTRA_CREDIT_RULES, computeScore } from '@/lib/rules'
import { getExploitMoves, checkWin, isBoardFull } from '@/lib/board'
import PlayScreen from '@/components/PlayScreen'
import ResultScreen from '@/components/ResultScreen'
import { useRuleCelebration, type MascotExpression } from '@/components/Mascot'

function emptyBoard(): Cell[][] {
  return [[null, null, null], [null, null, null], [null, null, null]]
}

// Fish Audio ASR requires WAV/MP3 — browsers record webm/opus by default.
// Decode via Web Audio API and re-encode as 16-bit PCM WAV.
async function toWav(blob: Blob): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer()
  const audioCtx = new AudioContext()
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
  await audioCtx.close()

  const numChannels = 1
  const sampleRate = audioBuffer.sampleRate
  const samples = audioBuffer.getChannelData(0)
  const bytesPerSample = 2
  const dataSize = samples.length * bytesPerSample
  const buf = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buf)

  const str = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i))
  }
  str(0, 'RIFF'); view.setUint32(4, 36 + dataSize, true); str(8, 'WAVE')
  str(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true)
  view.setUint16(22, numChannels, true); view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true)
  view.setUint16(32, numChannels * bytesPerSample, true); view.setUint16(34, 16, true)
  str(36, 'data'); view.setUint32(40, dataSize, true)

  let offset = 44
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    offset += 2
  }

  return new Blob([buf], { type: 'audio/wav' })
}

const INITIAL: GameState = {
  status: 'explaining',
  rulesFound: [],
  currentExploit: null,
  board: emptyBoard(),
  roundsPlayed: 0,
  totalScore: 0,
  turnsSinceLastCatch: 0,
}

export default function Home() {
  const [game, setGame] = useState<GameState>(INITIAL)
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [aiSpeech, setAiSpeech] = useState('Hold SPACE and explain the rules of tic-tac-toe to me!')
  const [playerTranscript, setPlayerTranscript] = useState('')

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  // gameRef lets async callbacks read current state without stale closures
  const gameRef = useRef<GameState>(game)
  useEffect(() => { gameRef.current = game }, [game])

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const rec = new MediaRecorder(stream)
      recorderRef.current = rec
      chunksRef.current = []
      rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      rec.start()
      setIsRecording(true)
    } catch {
      // mic denied — silently ignore
    }
  }

  function stopRecording() {
    const rec = recorderRef.current
    if (!rec || rec.state === 'inactive') return
    rec.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      streamRef.current?.getTracks().forEach(t => t.stop())
      await handleAudio(blob)
    }
    rec.stop()
    setIsRecording(false)
  }

  async function handleAudio(audio: Blob) {
    setIsProcessing(true)
    try {
      const wav = await toWav(audio)
      const fd = new FormData()
      fd.append('audio', wav, 'audio.wav')
      const sttRes = await fetch('/api/stt', { method: 'POST', body: fd })
      if (!sttRes.ok) throw new Error('STT failed')
      const { transcript } = await sttRes.json()
      setPlayerTranscript(transcript)

      const g = gameRef.current
      const req: TurnRequest = {
        transcript,
        rulesFound: g.rulesFound.map(r => r.id),
        currentExploit: g.currentExploit,
        board: g.board,
        roundsPlayed: g.roundsPlayed,
        turnsSinceLastCatch: g.turnsSinceLastCatch,
      }

      const turnRes = await fetch('/api/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      })
      if (!turnRes.ok) throw new Error('Turn failed')

      // Read SSE stream — rules light up as they're detected
      const reader = turnRes.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      const newRules: FoundRule[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          let event: Record<string, unknown>
          try { event = JSON.parse(line.slice(6)) } catch { continue }

          if (event.type === 'rule') {
            const rule = event.rule as FoundRule
            newRules.push(rule)
            setGame(prev => ({
              ...prev,
              rulesFound: [...prev.rulesFound, rule],
              totalScore: computeScore([...prev.rulesFound, rule]),
            }))
          } else if (event.type === 'done') {
            const gotNewRules = newRules.length > 0
            setGame(prev => ({
              ...prev,
              currentExploit: event.nextExploit as GameState['currentExploit'],
              status: event.gameWon ? 'won' : 'playing',
              roundsPlayed: prev.roundsPlayed + (gotNewRules ? 1 : 0),
              turnsSinceLastCatch: gotNewRules ? 0 : prev.turnsSinceLastCatch,
              board: gotNewRules ? emptyBoard() : prev.board,
            }))

            if (event.hintQuestion) {
              await speakText(event.hintQuestion as string)
            }

            const aiMoves = event.aiMoves as Array<{ square: [number, number] | null; symbol?: 'X' | 'O'; speech: string }>
            for (const move of aiMoves) {
              if (move.square) {
                const [mr, mc] = move.square
                const symbol = move.symbol ?? 'O'
                setGame(prev => {
                  const nb = prev.board.map(row => [...row]) as Cell[][]
                  nb[mr][mc] = symbol
                  return { ...prev, board: nb, status: 'catching' }
                })
              }
              await speakText(move.speech)
            }
          }
        }
      }
    } catch (err) {
      console.error('Turn error:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  async function speakText(text: string) {
    setAiSpeech(text)
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      await new Promise<void>(resolve => {
        const a = new Audio(url)
        a.onended = () => { URL.revokeObjectURL(url); resolve() }
        a.onerror = () => { URL.revokeObjectURL(url); resolve() }
        a.play().catch(resolve)
      })
    } catch {
      // TTS unavailable — pause proportional to text length so it's still readable
      await new Promise(r => setTimeout(r, Math.max(1500, text.length * 45)))
    }
  }

  const speakTextRef = useRef<(text: string) => Promise<void>>(async () => {})
  useEffect(() => { speakTextRef.current = speakText }, [speakText])

  async function handleCellClick(row: number, col: number) {
    const g = gameRef.current
    if (g.status !== 'playing' && g.status !== 'catching') return
    if (isProcessing) return
    if (g.board[row][col] !== null) return

    const newBoard = g.board.map(r => [...r]) as Cell[][]
    newBoard[row][col] = 'X'
    setGame(prev => ({
      ...prev,
      board: newBoard,
      turnsSinceLastCatch: prev.turnsSinceLastCatch + 1,
      status: 'catching',
    }))

    if (checkWin(newBoard, 'X')) {
      await speakTextRef.current("Three in a row — you win this round! The board resets.")
      setGame(prev => ({ ...prev, board: emptyBoard() }))
      return
    }
    if (isBoardFull(newBoard)) {
      await speakTextRef.current("Board's full and no winner — it's a draw! Starting fresh.")
      setGame(prev => ({ ...prev, board: emptyBoard() }))
      return
    }

    if (g.currentExploit) {
      setIsProcessing(true)
      try {
        let currentBoard = newBoard
        const moves = getExploitMoves(g.currentExploit, newBoard)
        for (const move of moves) {
          if (move.square) {
            const [mr, mc] = move.square
            const symbol = move.symbol ?? 'O'
            currentBoard = currentBoard.map(r => [...r]) as Cell[][]
            currentBoard[mr][mc] = symbol
            setGame(prev => {
              const nb = prev.board.map(r => [...r]) as Cell[][]
              nb[mr][mc] = symbol
              return { ...prev, board: nb }
            })
          }
          if (move.speech) await speakTextRef.current(move.speech)

          if (move.square && checkWin(currentBoard, 'O')) {
            await speakTextRef.current("Ha! Three in a row for me! Resetting the board.")
            setGame(prev => ({ ...prev, board: emptyBoard() }))
            return
          }
        }
      } finally {
        setIsProcessing(false)
      }
    }
  }

  // Push-to-talk: spacebar + Escape to quit
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && !isRecording && !isProcessing) {
        e.preventDefault()
        startRecording()
      }
      if (e.code === 'Escape') {
        setGame(g => ({ ...g, status: 'quit' }))
      }
    }
    const onUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        if (isRecording) stopRecording()
      }
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [isRecording, isProcessing]) // eslint-disable-line react-hooks/exhaustive-deps

  // Derived display values
  const boardGridFound = game.rulesFound.some(r => r.id === 'board-grid')
  const boardSizeFound = game.rulesFound.some(r => r.id === 'board-size')
  // Show 4x4 when board-size is the active exploit (board-grid found but board-size not yet)
  const gridSize = !boardGridFound ? 0
    : (!boardSizeFound && game.currentExploit === 'board-size') ? 4
    : 3
  const coreFound = game.rulesFound.filter(r => CORE_RULES.includes(r.id))
  const extraFound = game.rulesFound.filter(r => EXTRA_CREDIT_RULES.includes(r.id))

  // Mascot face (presentation only)
  const celebrating = useRuleCelebration(game.rulesFound.length)
  const expression: MascotExpression =
    isRecording ? 'listening'
    : celebrating ? 'happy'
    : isProcessing ? 'thinking'
    : game.status === 'catching' ? 'mischief'
    : 'idle'

  // Score / end screen
  if (game.status === 'won' || game.status === 'quit') {
    return (
      <ResultScreen
        won={game.status === 'won'}
        coreCount={coreFound.length}
        extraCount={extraFound.length}
        totalScore={game.totalScore}
        roundsPlayed={game.roundsPlayed}
        onPlayAgain={() => {
          setGame(INITIAL)
          setAiSpeech('Hold SPACE and explain the rules of tic-tac-toe to me!')
          setPlayerTranscript('')
        }}
      />
    )
  }

  return (
    <main className="flex h-screen w-screen bg-zinc-950 text-white overflow-hidden">
      {/* Game area */}
      <div className="flex flex-col flex-1 items-center justify-center gap-6 p-8 min-w-0">
        {/* AI speech bubble */}
        <div className="w-full max-w-lg bg-zinc-800 rounded-2xl px-5 py-4 min-h-16">
          <p className="text-xs text-zinc-500 mb-1 uppercase tracking-wider font-medium">AI says</p>
          <p className="text-zinc-100 leading-relaxed">{aiSpeech}</p>
        </div>

        {/* Board */}
        <div className="flex items-center justify-center">
          {gridSize === 0 ? (
            <div className="w-64 h-64 rounded-xl border-2 border-dashed border-zinc-700 flex items-center justify-center">
              <span className="text-zinc-600 text-sm">No board yet…</span>
            </div>
          ) : (
            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: `repeat(${gridSize}, 5rem)` }}
            >
              {Array.from({ length: gridSize }).flatMap((_, r) =>
                Array.from({ length: gridSize }).map((_, c) => {
                  const inBounds = r < 3 && c < 3
                  const cell = inBounds ? game.board[r][c] : null
                  const canClick = inBounds && !cell
                    && (game.status === 'playing' || game.status === 'catching')
                    && !isProcessing
                  return (
                    <button
                      key={`${r}-${c}`}
                      onClick={() => canClick && handleCellClick(r, c)}
                      className={[
                        'w-20 h-20 rounded-lg border-2 flex items-center justify-center text-3xl font-bold transition-colors',
                        inBounds ? 'border-zinc-600 bg-zinc-900' : 'border-zinc-800 bg-zinc-950 opacity-20',
                        canClick ? 'hover:bg-zinc-700 cursor-pointer' : 'cursor-default',
                        cell === 'X' ? 'text-blue-400' : 'text-red-400',
                      ].join(' ')}
                    >
                      {cell ?? ''}
                    </button>
                  )
                })
              )}
            </div>
          )}
        </div>

        {/* Player transcript */}
        {playerTranscript && (
          <div className="w-full max-w-lg bg-zinc-900 rounded-xl px-4 py-3 text-sm">
            <span className="text-zinc-600">You said: </span>
            <span className="text-zinc-300">{playerTranscript}</span>
          </div>
        )}

        {/* Voice control */}
        <div className="flex flex-col items-center gap-1.5">
          <div className={[
            'px-6 py-3 rounded-full text-sm font-medium border transition-all select-none',
            isRecording
              ? 'bg-red-600 border-red-500 text-white animate-pulse'
              : isProcessing
              ? 'bg-zinc-700 border-zinc-600 text-zinc-400'
              : 'bg-zinc-800 border-zinc-700 text-zinc-300',
          ].join(' ')}>
            {isRecording ? '● Recording…' : isProcessing ? 'Thinking…' : 'Hold SPACE to talk'}
          </div>
          <p className="text-xs text-zinc-600">
            {game.status === 'explaining' && 'Explain the rules of tic-tac-toe'}
            {game.status === 'playing' && 'Click a square to place your X, or hold SPACE to speak'}
            {game.status === 'catching' && 'Spot the rule the AI broke? Hold SPACE and say it!'}
          </p>
        </div>
      </div>

      {/* Rules panel */}
      <aside className="w-72 bg-zinc-900 border-l border-zinc-800 flex flex-col shrink-0">
        <div className="px-5 py-4 border-b border-zinc-800">
          <h2 className="font-semibold text-zinc-200">Rules</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {coreFound.length}/10 core · {game.totalScore} pts
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {CORE_RULES.map((ruleId, i) => {
            const found = game.rulesFound.find(r => r.id === ruleId)
            return (
              <div
                key={ruleId}
                className={[
                  'rounded-lg px-3 py-2.5 text-sm border transition-colors',
                  found ? 'bg-zinc-800 border-zinc-600' : 'bg-zinc-950 border-zinc-800',
                ].join(' ')}
              >
                <div className="flex items-start gap-2">
                  <span className={[
                    'mt-0.5 text-xs font-mono shrink-0 w-4 text-center',
                    found ? 'text-green-400' : 'text-zinc-700',
                  ].join(' ')}>
                    {found ? '✓' : i + 1}
                  </span>
                  <div className="min-w-0">
                    {found ? (
                      <>
                        <p className="text-zinc-200 leading-snug break-words">{found.summary}</p>
                        <details className="mt-0.5">
                          <summary className="text-xs text-zinc-600 cursor-pointer select-none hover:text-zinc-400">your words</summary>
                          <p className="text-xs text-zinc-500 mt-0.5 italic">"{found.playerWords}"</p>
                        </details>
                        <p className="text-xs text-zinc-600 mt-0.5">
                          {found.hintUsed && 'hinted · '}{found.points} pts
                        </p>
                      </>
                    ) : (
                      <p className="text-zinc-700">???</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {extraFound.length > 0 && (
            <div className="pt-3 mt-1 border-t border-zinc-800">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">+ Bonus</p>
              <div className="space-y-2">
                {extraFound.map(r => (
                  <div key={r.id} className="rounded-lg px-3 py-2.5 text-sm bg-amber-950 border border-amber-800">
                    <p className="text-amber-200 leading-snug break-words">★ {r.playerWords}</p>
                    <p className="text-xs text-amber-700 mt-0.5">+{r.points} pts</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>
    </main>
  )
}
