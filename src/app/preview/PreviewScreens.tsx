'use client'

import { use } from 'react'
import type { Cell, FoundRule, GameState } from '@/types/game'
import { CORE_RULES, EXTRA_CREDIT_RULES, computeScore } from '@/lib/rules'
import PlayScreen from '@/components/PlayScreen'
import ResultScreen from '@/components/ResultScreen'
import { MASCOT_EXPRESSIONS, type MascotExpression } from '@/components/Mascot'

const RULES: FoundRule[] = [
  { id: 'board-grid', summary: '3×3 grid', playerWords: 'you draw a 3 by 3 grid', hintUsed: false, points: 10 },
  { id: 'board-size', summary: '3 columns, 3 rows', playerWords: 'you draw a 3 by 3 grid', hintUsed: false, points: 10 },
  { id: 'take-turns', summary: 'players take turns', playerWords: 'we take turns', hintUsed: false, points: 10 },
  { id: 'own-marks-only', summary: 'only draw your own mark', playerWords: 'you can only draw your own mark', hintUsed: true, points: 5 },
]

const BOARD: Cell[][] = [
  ['O', null, null],
  [null, 'O', null],
  [null, null, null],
]

const GAME: GameState = {
  status: 'catching',
  rulesFound: RULES,
  currentExploit: 'own-symbol',
  board: BOARD,
  roundsPlayed: 3,
  totalScore: computeScore(RULES),
  turnsSinceLastCatch: 1,
  conversationLog: [],
}

type Search = { [key: string]: string | string[] | undefined }

export default function PreviewScreens({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = use(searchParams)
  const state = typeof sp.state === 'string' ? sp.state : 'play'
  const exprParam = typeof sp.expr === 'string' ? sp.expr : 'mischief'
  const expression: MascotExpression = (MASCOT_EXPRESSIONS as string[]).includes(exprParam)
    ? (exprParam as MascotExpression)
    : 'mischief'

  const coreFound = GAME.rulesFound.filter(r => CORE_RULES.includes(r.id))
  const extraFound = GAME.rulesFound.filter(r => EXTRA_CREDIT_RULES.includes(r.id))

  if (state === 'result') {
    return (
      <ResultScreen
        won={false}
        coreCount={coreFound.length}
        extraCount={extraFound.length}
        totalScore={GAME.totalScore}
        roundsPlayed={GAME.roundsPlayed}
        onPlayAgain={() => {}}
      />
    )
  }

  return (
    <PlayScreen
      game={GAME}
      gridSize={3}
      coreRules={CORE_RULES}
      extraFound={extraFound}
      aiSpeech="Here's my move!"
      playerTranscript="you can only draw your own mark"
      isRecording={expression === 'listening'}
      isProcessing={expression === 'thinking'}
      expression={expression}
      canClickCell={(r, c) => r < 3 && c < 3 && GAME.board[r][c] === null}
      onCellClick={() => {}}
      ghostX={[[1, 1]]}
    />
  )
}
