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
  conversationLog: [],
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
        conversationLog: g.conversationLog,
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
              // AI found rules → new phase, start fresh log. No rules found → accumulate.
              conversationLog: gotNewRules ? [] : [...prev.conversationLog, transcript],
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
    if (!text.trim()) return
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
