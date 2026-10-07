'use client'

import { useState, useEffect, useRef } from 'react'
import type { GameState, Cell, TurnRequest, TurnResponse } from '@/types/game'
import { CORE_RULES, EXTRA_CREDIT_RULES, computeScore } from '@/lib/rules'

function emptyBoard(): Cell[][] {
  return [[null, null, null], [null, null, null], [null, null, null]]
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
      const fd = new FormData()
      fd.append('audio', audio)
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
      const data: TurnResponse = await turnRes.json()

      const allRules = [...g.rulesFound, ...data.newRulesFound]
      const gotNewRules = data.newRulesFound.length > 0

      setGame(prev => ({
        ...prev,
        rulesFound: allRules,
        currentExploit: data.nextExploit,
        totalScore: computeScore(allRules),
        status: data.gameWon ? 'won' : 'playing',
        roundsPlayed: prev.roundsPlayed + (gotNewRules ? 1 : 0),
        turnsSinceLastCatch: gotNewRules ? 0 : prev.turnsSinceLastCatch,
        board: gotNewRules ? emptyBoard() : prev.board,
      }))

      if (data.hintQuestion) {
        await speakText(data.hintQuestion)
      }

      // Execute AI moves sequentially: board update + audio in sync
      for (const move of data.aiMoves) {
        if (move.square) {
          const [r, c] = move.square
          const symbol = move.symbol ?? 'O'
          setGame(prev => {
            const nb = prev.board.map(row => [...row]) as Cell[][]
            nb[r][c] = symbol
            return { ...prev, board: nb, status: 'catching' }
          })
        }
        await speakText(move.speech)
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

  function handleCellClick(row: number, col: number) {
    const g = gameRef.current
    if (g.status !== 'playing' && g.status !== 'catching') return
    if (isProcessing) return
    if (g.board[row][col] !== null) return
    setGame(prev => {
      const nb = prev.board.map(r => [...r]) as Cell[][]
      nb[row][col] = 'X'
      return { ...prev, board: nb, turnsSinceLastCatch: prev.turnsSinceLastCatch + 1, status: 'catching' }
    })
  }

  // Derived display values
  const boardGridFound = game.rulesFound.some(r => r.id === 'board-grid')
  const boardSizeFound = game.rulesFound.some(r => r.id === 'board-size')
  // Show 4x4 when board-size is the active exploit (board-grid found but board-size not yet)
  const gridSize = !boardGridFound ? 0
    : (!boardSizeFound && game.currentExploit === 'board-size') ? 4
    : 3
  const coreFound = game.rulesFound.filter(r => CORE_RULES.includes(r.id))
  const extraFound = game.rulesFound.filter(r => EXTRA_CREDIT_RULES.includes(r.id))

  // Score / end screen
  if (game.status === 'won' || game.status === 'quit') {
    return (
      <main className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-white">
        <div className="text-center space-y-6 max-w-sm px-6">
          <h1 className="text-4xl font-bold leading-tight">
            {game.status === 'won' ? 'You taught me tic-tac-toe!' : 'Maybe next time…'}
          </h1>
          <div className="space-y-1.5 text-lg text-zinc-300">
            <p>Core rules: <strong className="text-white">{coreFound.length}/10</strong></p>
            <p>Extra credit: <strong className="text-white">{extraFound.length}</strong></p>
            <p>Score: <strong className="text-white">{game.totalScore} pts</strong></p>
            <p>Rounds played: <strong className="text-white">{game.roundsPlayed}</strong></p>
          </div>
          <button
            onClick={() => {
              setGame(INITIAL)
              setAiSpeech('Hold SPACE and explain the rules of tic-tac-toe to me!')
              setPlayerTranscript('')
            }}
            className="px-6 py-3 bg-zinc-700 hover:bg-zinc-600 rounded-xl text-sm font-medium transition-colors"
          >
            Play again
          </button>
        </div>
      </main>
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
                        <p className="text-zinc-200 leading-snug break-words">{found.playerWords}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">
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
