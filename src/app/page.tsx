'use client'

import { useState, useEffect, useRef } from 'react'
import type { GameState, Cell, TurnRequest, TurnResponse } from '@/types/game'
import { CORE_RULES, EXTRA_CREDIT_RULES, computeScore } from '@/lib/rules'
import PlayScreen from '@/components/PlayScreen'
import ResultScreen from '@/components/ResultScreen'
import { useRuleCelebration, type MascotExpression } from '@/components/Mascot'

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
    <PlayScreen
      game={game}
      gridSize={gridSize}
      coreRules={CORE_RULES}
      extraFound={extraFound}
      aiSpeech={aiSpeech}
      playerTranscript={playerTranscript}
      isRecording={isRecording}
      isProcessing={isProcessing}
      expression={expression}
      canClickCell={(r, c) => {
        const inBounds = r < 3 && c < 3
        const cell = inBounds ? game.board[r][c] : null
        return inBounds && !cell
          && (game.status === 'playing' || game.status === 'catching')
          && !isProcessing
      }}
      onCellClick={handleCellClick}
    />
  )
}
