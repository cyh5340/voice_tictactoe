import type { Board, Cell, RuleId, AiMove } from '@/types/game'
import { pickExploitLine } from '@/lib/rules'

export function emptySquares(board: Board): [number, number][] {
  const result: [number, number][] = []
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      if (board[r][c] === null) result.push([r, c])
    }
  }
  return result
}

export function squaresOccupiedBy(board: Board, symbol: Cell): [number, number][] {
  const result: [number, number][] = []
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      if (board[r][c] === symbol) result.push([r, c])
    }
  }
  return result
}

export function checkWin(board: Board, symbol: Cell): boolean {
  const n = board.length
  // rows
  for (let r = 0; r < n; r++) {
    if (board[r].every(c => c === symbol)) return true
  }
  // columns
  for (let c = 0; c < n; c++) {
    if (board.every(r => r[c] === symbol)) return true
  }
  // main diagonal
  if (board.every((r, i) => r[i] === symbol)) return true
  // anti diagonal
  if (board.every((r, i) => r[n - 1 - i] === symbol)) return true
  return false
}

export function isBoardFull(board: Board): boolean {
  return board.every(row => row.every(cell => cell !== null))
}

export function makeEmptyBoard(size: 3 | 4 = 3): Board {
  return Array.from({ length: size }, () => Array(size).fill(null))
}

// Returns the AI's move sequence for a given exploit.
// Board move logic lives here so Session 3 can run it client-side.
export function getExploitMoves(exploit: RuleId, board: Board): AiMove[] {
  const speech = pickExploitLine(exploit)
  const empty = emptySquares(board)
  const playerSquares = squaresOccupiedBy(board, 'X')

  switch (exploit) {
    case 'board-grid':
      // No board yet — AI just speaks
      return [{ square: null, speech }]

    case 'board-size':
      // AI speaks; client handles resizing the board to 4×4
      return [{ square: null, speech }]

    case 'own-symbol':
      // AI places a smiley/wrong symbol (client renders symbol differently)
      return [{ square: empty[0] ?? null, symbol: 'O', speech }]

    case 'own-marks-only': {
      // AI places its O silently, then draws the player's X with speech — so the
      // speech fires when the X actually appears, not when the O does.
      const aiSquare = empty[0] ?? null
      const playerSquare = empty[1] ?? null
      return [
        { square: aiSquare, symbol: 'O', speech: '' },
        { square: playerSquare, symbol: 'X', speech },
      ]
    }

    case 'take-turns': {
      // AI places three Os in a row
      const [s1, s2, s3] = empty
      return [
        { square: s1 ?? null, symbol: 'O', speech },
        { square: s2 ?? null, symbol: 'O', speech: '' },
        { square: s3 ?? null, symbol: 'O', speech: '' },
      ]
    }

    case 'one-mark-per-turn': {
      // AI places two Os at once
      const [s1, s2] = empty
      return [
        { square: s1 ?? null, symbol: 'O', speech },
        { square: s2 ?? null, symbol: 'O', speech: '' },
      ]
    }

    case 'empty-squares-only': {
      // AI places its O on a square the player already marked
      const target = playerSquares[0] ?? empty[0] ?? null
      return [{ square: target, symbol: 'O', speech }]
    }

    case 'win-three':
      // AI makes a normal move, then claims win with 2 (handled by game logic)
      return [{ square: empty[0] ?? null, symbol: 'O', speech }]

    case 'win-ends-game':
      // AI makes a normal move; even after player wins, AI keeps going
      return [{ square: empty[0] ?? null, symbol: 'O', speech }]

    case 'draw-full':
      // AI makes a normal move; on full board, declares points win
      return [{ square: empty[0] ?? null, symbol: 'O', speech }]

    case 'two-players':
      // AI makes its normal move, pretends a third player exists
      return [{ square: empty[0] ?? null, symbol: 'O', speech }]

    case 'no-skipping':
      // AI passes its turn
      return [{ square: null, speech }]

    case 'inside-squares':
      // AI makes a move (client renders the mark oversized)
      return [{ square: empty[0] ?? null, symbol: 'O', speech }]

    case 'win-directions':
      // AI makes a normal move; rejects diagonal wins when they come up
      return [{ square: empty[0] ?? null, symbol: 'O', speech }]

    default:
      return [{ square: empty[0] ?? null, symbol: 'O', speech }]
  }
}
