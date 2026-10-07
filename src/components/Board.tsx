import type { Board as BoardCells } from '@/types/game'

const INK = 'var(--ink)'
const UNIT = 100 // SVG units per cell

type Props = {
  board: BoardCells
  /** 0 = no grid drawn yet (blank slab), 3 = normal, 4 = the 4x4 exploit */
  gridSize: number
  /** whether a cell (row, col) may be clicked right now */
  canClick: (row: number, col: number) => boolean
  onCellClick: (row: number, col: number) => void
  /** presentation only: faint player X shown beneath an O (e.g. an O drawn over an X) */
  ghostX?: Array<[number, number]>
}

export default function Board({ board, gridSize, canClick, onCellClick, ghostX = [] }: Props) {
  const n = gridSize
  const span = Math.max(n, 1) * UNIT
  // interior lines: vertical then horizontal, drawn one after another like a pen
  const lines: Array<[number, number, number, number]> = []
  for (let i = 1; i < n; i++) lines.push([i * UNIT, 8, i * UNIT, span - 8])
  for (let i = 1; i < n; i++) lines.push([8, i * UNIT, span - 8, i * UNIT])
  const perLine = n === 4 ? 0.22 : 0.3

  return (
    <div className="marble-slab relative aspect-square w-full p-[5%]">
      {/* faint marble veins */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <path d="M-2 22 C18 30 26 18 44 28 S70 26 102 40" fill="none" stroke="var(--marble-vein)" strokeWidth="0.5" />
        <path d="M-2 78 C20 70 34 86 58 76 S84 70 102 82" fill="none" stroke="var(--marble-vein)" strokeWidth="0.4" />
        <path d="M60 -2 C56 18 66 30 62 52" fill="none" stroke="var(--marble-vein)" strokeWidth="0.3" />
      </svg>

      {n > 0 && (
        <div className="relative h-full w-full">
          <svg
            key={n}
            className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
            viewBox={`0 0 ${span} ${span}`}
            aria-hidden
          >
            {/* carved grid: dark groove with a light lip, drawn stroke by stroke */}
            {lines.map(([x1, y1, x2, y2], i) => (
              <g key={i} strokeLinecap="round">
                <line x1={x1} y1={y1} x2={x2} y2={y2} pathLength={1} className="draw" stroke={INK} strokeWidth={n === 4 ? 9 : 11}
                  style={{ ['--draw-delay' as string]: `${i * perLine}s`, ['--draw-dur' as string]: `${perLine}s` }} />
              </g>
            ))}

            {/* ghost X under an O (presentation only) */}
            {ghostX.map(([r, c]) => (
              <g key={`g${r}-${c}`} opacity={0.35}>
                <XMark r={r} c={c} />
              </g>
            ))}

            {/* marks */}
            {board.map((row, r) =>
              row.map((cell, c) => {
                if (cell === 'X') return <XMark key={`${r}-${c}-X`} r={r} c={c} stamp />
                if (cell === 'O') return <OMark key={`${r}-${c}-O`} r={r} c={c} />
                return null
              })
            )}
          </svg>

          {/* click targets */}
          <div
            className="absolute inset-0 grid"
            style={{ gridTemplateColumns: `repeat(${n}, 1fr)`, gridTemplateRows: `repeat(${n}, 1fr)` }}
          >
            {Array.from({ length: n }).flatMap((_, r) =>
              Array.from({ length: n }).map((_, c) => {
                const inBounds = r < 3 && c < 3
                const cell = inBounds ? board[r][c] : null
                const clickable = canClick(r, c)
                return (
                  <button
                    key={`${r}-${c}`}
                    onClick={() => clickable && onCellClick(r, c)}
                    aria-label={`Row ${r + 1}, column ${c + 1}${cell ? `, ${cell}` : ''}`}
                    className={[
                      'm-[10%] rounded-2xl transition-colors',
                      clickable ? 'cursor-pointer hover:bg-[rgba(31,116,204,0.12)]' : 'cursor-default',
                    ].join(' ')}
                  />
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function XMark({ r, c, stamp = false }: { r: number; c: number; stamp?: boolean }) {
  const x = c * UNIT + UNIT / 2
  const y = r * UNIT + UNIT / 2
  const d = 26
  const path = `M${x - d} ${y - d} L${x + d} ${y + d} M${x + d} ${y - d} L${x - d} ${y + d}`
  return (
    <g className={stamp ? 'stamp' : undefined} strokeLinecap="round" fill="none">
      <path d={path} stroke={INK} strokeWidth={24} />
      <path d={path} stroke="var(--med-blue)" strokeWidth={13} />
      <path d={path} stroke="var(--med-blue-light)" strokeWidth={4} transform="translate(-2 -3)" />
    </g>
  )
}

function OMark({ r, c }: { r: number; c: number }) {
  const cx = c * UNIT + UNIT / 2
  const cy = r * UNIT + UNIT / 2
  const rad = 28
  // start at 12 o'clock, draw clockwise
  const path = `M${cx} ${cy - rad} A${rad} ${rad} 0 1 1 ${cx - 0.01} ${cy - rad}`
  return (
    <g fill="none" strokeLinecap="round">
      <path d={path} pathLength={1} className="draw" stroke={INK} strokeWidth={24} />
      <path d={path} pathLength={1} className="draw" stroke="var(--terracotta)" strokeWidth={13} />
    </g>
  )
}
