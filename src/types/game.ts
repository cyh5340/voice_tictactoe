export type RuleId =
  | 'board-grid'
  | 'board-size'
  | 'own-symbol'
  | 'own-marks-only'
  | 'take-turns'
  | 'one-mark-per-turn'
  | 'empty-squares-only'
  | 'win-three'
  | 'win-ends-game'
  | 'draw-full'
  | 'two-players'
  | 'no-skipping'
  | 'inside-squares'
  | 'win-directions'

export type Cell = 'X' | 'O' | null
export type Board = Cell[][]

export type FoundRule = {
  id: RuleId
  summary: string      // 3-6 word summary shown in the rules panel
  playerWords: string  // full transcript shown in expandable
  hintUsed: boolean
  points: number
}

export type AiMove = {
  square: [number, number] | null  // null = speech only, no board change
  symbol?: 'X' | 'O'              // which symbol to place; defaults to 'O' (AI)
  speech: string
}

export type GameStatus = 'explaining' | 'playing' | 'catching' | 'won' | 'quit'

export type GameState = {
  status: GameStatus
  rulesFound: FoundRule[]
  currentExploit: RuleId | null
  board: Board
  roundsPlayed: number
  totalScore: number
  turnsSinceLastCatch: number
}

// /api/stt
export type SttRequest = {
  audio: Blob  // sent as FormData
}
export type SttResponse = {
  transcript: string
}

// /api/tts — body: { text } → streaming audio response

// /api/turn
export type TurnRequest = {
  transcript: string
  rulesFound: RuleId[]
  currentExploit: RuleId | null
  board: Board
  roundsPlayed: number
  turnsSinceLastCatch: number
}

export type TurnResponse = {
  newRulesFound: FoundRule[]
  nextExploit: RuleId | null
  aiMoves: AiMove[]            // ordered speech + optional board moves for the client to play
  hintQuestion: string | null  // in-character hint when turnsSinceLastCatch >= 2
  gameWon: boolean
}
