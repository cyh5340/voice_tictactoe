'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'

export type MascotExpression = 'idle' | 'listening' | 'thinking' | 'mischief' | 'happy'

export const MASCOT_EXPRESSIONS: MascotExpression[] = ['idle', 'listening', 'thinking', 'mischief', 'happy']

// Image slot: drop generated art at public/art/mascot-<expression>.png and flip this
// flag to true. No runtime file checks — the SVG below is the default.
export const USE_GENERATED_ART = false

const INK = 'var(--ink)'

/**
 * Presentation-only: true for a couple of seconds after the number of found rules goes up,
 * so the mascot can look pleased. Does not touch game state.
 */
export function useRuleCelebration(foundCount: number, ms = 2500): boolean {
  const [seen, setSeen] = useState(foundCount)
  const [celebrating, setCelebrating] = useState(false)
  if (foundCount !== seen) {
    setSeen(foundCount)
    setCelebrating(foundCount > seen)
  }
  useEffect(() => {
    if (!celebrating) return
    const t = setTimeout(() => setCelebrating(false), ms)
    return () => clearTimeout(t)
  }, [celebrating, seen, ms])
  return celebrating
}

type Props = {
  expression: MascotExpression
  size?: number
  className?: string
}

export default function Mascot({ expression, size = 280, className = '' }: Props) {
  const label = `The pupil looks ${expression === 'mischief' ? 'innocently mischievous' : expression}`
  if (USE_GENERATED_ART) {
    return (
      <Image
        src={`/art/mascot-${expression}.png`}
        alt={label}
        width={size}
        height={Math.round(size * 340 / 300)}
        className={className}
        priority
      />
    )
  }
  return (
    <svg
      viewBox="0 0 300 340"
      width={size}
      height={Math.round(size * 340 / 300)}
      role="img"
      aria-label={label}
      className={className}
    >
      {/* floor shadow */}
      <ellipse cx="150" cy="327" rx="96" ry="11" fill="rgba(60,20,5,0.25)" />

      {/* thought puffs */}
      {expression === 'thinking' && (
        <g fill="#fff" stroke={INK} strokeWidth="4">
          <circle cx="250" cy="70" r="8" className="think-dot" style={{ animationDelay: '0s' }} />
          <circle cx="268" cy="44" r="12" className="think-dot" style={{ animationDelay: '0.15s' }} />
          <circle cx="280" cy="14" r="9" className="think-dot" style={{ animationDelay: '0.3s' }} />
        </g>
      )}

      {/* sandals */}
      <g stroke={INK} strokeWidth="5" fill="#8a5a2b">
        <ellipse cx="118" cy="318" rx="26" ry="11" />
        <ellipse cx="182" cy="318" rx="26" ry="11" />
      </g>

      {/* raised arms (happy) sit behind the body */}
      {expression === 'happy' && (
        <g stroke={INK} strokeWidth="5" fill="var(--skin)">
          <path d="M92 228 L52 178" strokeWidth="22" stroke={INK} strokeLinecap="round" />
          <path d="M92 228 L52 178" strokeWidth="12" stroke="var(--skin)" strokeLinecap="round" />
          <circle cx="50" cy="174" r="15" />
          <path d="M208 228 L248 178" strokeWidth="22" stroke={INK} strokeLinecap="round" />
          <path d="M208 228 L248 178" strokeWidth="12" stroke="var(--skin)" strokeLinecap="round" />
          <circle cx="250" cy="174" r="15" />
        </g>
      )}

      {/* toga body */}
      <path
        d="M98 205 C78 240 70 285 74 312 L226 312 C230 285 222 240 202 205 Z"
        fill="var(--marble)"
        stroke={INK}
        strokeWidth="6"
        strokeLinejoin="round"
      />
      {/* drape fold with the terracotta border (clavus) */}
      <path d="M100 210 C140 245 180 270 222 300" fill="none" stroke="var(--terracotta)" strokeWidth="12" strokeLinecap="round" />
      <path d="M100 210 C140 245 180 270 222 300" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" transform="translate(0 -8)" />
      <path d="M118 280 C130 290 150 296 170 296" fill="none" stroke="var(--marble-vein)" strokeWidth="4" strokeLinecap="round" />

      {/* hands at sides (idle / listening / thinking right hand) */}
      {(expression === 'idle' || expression === 'listening' || expression === 'thinking') && (
        <g fill="var(--skin)" stroke={INK} strokeWidth="5">
          <circle cx="82" cy="262" r="15" />
          {expression !== 'thinking' && <circle cx="218" cy="262" r="15" />}
        </g>
      )}

      {/* head group */}
      <g transform={expression === 'listening' ? 'rotate(-6 150 130)' : expression === 'mischief' ? 'rotate(4 150 130)' : undefined}>
        {/* ears */}
        <g fill="var(--skin)" stroke={INK} strokeWidth="5">
          <circle cx="62" cy="140" r="18" />
          <circle cx="238" cy="140" r="18" />
        </g>
        {/* face */}
        <circle cx="150" cy="128" r="90" fill="var(--skin)" stroke={INK} strokeWidth="6" />

        {/* curls */}
        <g fill="var(--hair)" stroke={INK} strokeWidth="4">
          {[-168, -150, -132, -114, -96, -78, -60, -42, -24, -10].map((deg, i) => {
            const rad = (deg * Math.PI) / 180
            const r = 78
            return (
              <circle
                key={deg}
                cx={(150 + r * Math.cos(rad)).toFixed(1)}
                cy={(128 + r * Math.sin(rad)).toFixed(1)}
                r={i % 2 === 0 ? 24 : 21}
              />
            )
          })}
          <circle cx="118" cy="66" r="22" />
          <circle cx="150" cy="60" r="23" />
          <circle cx="182" cy="66" r="22" />
        </g>

        {/* laurel wreath */}
        <g fill="var(--leaf)" stroke={INK} strokeWidth="3">
          {[-175, -160, -145, -130, -115].map(deg => {
            const rad = (deg * Math.PI) / 180
            const x = 150 + 94 * Math.cos(rad)
            const y = 120 + 94 * Math.sin(rad)
            return <ellipse key={`l${deg}`} cx={x.toFixed(1)} cy={y.toFixed(1)} rx="15" ry="7" transform={`rotate(${deg + 120} ${x.toFixed(1)} ${y.toFixed(1)})`} />
          })}
          {[-5, -20, -35, -50, -65].map(deg => {
            const rad = (deg * Math.PI) / 180
            const x = 150 + 94 * Math.cos(rad)
            const y = 120 + 94 * Math.sin(rad)
            return <ellipse key={`r${deg}`} cx={x.toFixed(1)} cy={y.toFixed(1)} rx="15" ry="7" transform={`rotate(${deg + 60} ${x.toFixed(1)} ${y.toFixed(1)})`} />
          })}
        </g>

        {/* cheeks */}
        <g fill="#f29a9a" opacity={expression === 'happy' || expression === 'mischief' ? 0.85 : 0.5}>
          <ellipse cx="95" cy="168" rx="17" ry="10" />
          <ellipse cx="205" cy="168" rx="17" ry="10" />
        </g>

        <Face expression={expression} />
      </g>

      {/* thinking: hand on chin, drawn over the face */}
      {expression === 'thinking' && (
        <g>
          <path d="M214 262 C228 240 214 214 196 206" fill="none" stroke={INK} strokeWidth="22" strokeLinecap="round" />
          <path d="M214 262 C228 240 214 214 196 206" fill="none" stroke="var(--skin)" strokeWidth="12" strokeLinecap="round" />
          <circle cx="190" cy="200" r="15" fill="var(--skin)" stroke={INK} strokeWidth="5" />
        </g>
      )}
    </svg>
  )
}

function Eye({ cx, cy, rx = 13, ry = 18, look = [0, 0] as [number, number] }: { cx: number; cy: number; rx?: number; ry?: number; look?: [number, number] }) {
  return (
    <g>
      <ellipse cx={cx + look[0]} cy={cy + look[1]} rx={rx} ry={ry} fill={INK} />
      <circle cx={cx + look[0] + rx * 0.35} cy={cy + look[1] - ry * 0.4} r={rx * 0.38} fill="#fff" />
      <circle cx={cx + look[0] - rx * 0.3} cy={cy + look[1] + ry * 0.35} r={rx * 0.15} fill="#fff" />
    </g>
  )
}

function Face({ expression }: { expression: MascotExpression }) {
  const stroke = { stroke: INK, strokeWidth: 6, strokeLinecap: 'round' as const, fill: 'none' }
  switch (expression) {
    case 'listening':
      return (
        <g>
          <path d="M100 98 Q115 84 132 94" {...stroke} />
          <path d="M168 94 Q185 84 200 98" {...stroke} />
          <Eye cx={116} cy={132} rx={15} ry={21} />
          <Eye cx={184} cy={132} rx={15} ry={21} />
          <ellipse cx="150" cy="180" rx="10" ry="12" fill={INK} />
        </g>
      )
    case 'thinking':
      return (
        <g>
          <path d="M100 106 Q116 98 132 104" {...stroke} />
          <path d="M168 96 Q186 84 202 94" {...stroke} />
          <Eye cx={116} cy={134} look={[6, -7]} />
          <Eye cx={184} cy={134} look={[6, -7]} />
          <path d="M132 182 Q142 176 150 182 T168 180" {...stroke} />
        </g>
      )
    case 'mischief':
      return (
        <g>
          <path d="M100 108 Q116 104 132 110" {...stroke} />
          <path d="M168 98 Q186 86 202 96" {...stroke} />
          <Eye cx={116} cy={136} look={[-7, 2]} />
          <Eye cx={184} cy={136} look={[-7, 2]} />
          {/* lazy lids: innocent, half-closed */}
          <path d="M98 128 Q116 112 134 128 L134 112 L98 112 Z" fill="var(--skin)" />
          <path d="M166 128 Q184 112 202 128 L202 112 L166 112 Z" fill="var(--skin)" />
          <path d="M99 128 Q116 120 133 128" {...stroke} strokeWidth={5} />
          <path d="M167 128 Q184 120 201 128" {...stroke} strokeWidth={5} />
          {/* lopsided grin with a tongue tip */}
          <path d="M128 176 Q150 186 176 168" {...stroke} />
          <path d="M160 179 Q166 192 174 184 Q172 176 166 176" fill="#e86a6a" stroke={INK} strokeWidth="4" />
        </g>
      )
    case 'happy':
      return (
        <g>
          <path d="M100 96 Q116 86 132 94" {...stroke} />
          <path d="M168 94 Q184 86 200 96" {...stroke} />
          <path d="M102 138 Q116 118 130 138" {...stroke} strokeWidth={7} />
          <path d="M170 138 Q184 118 198 138" {...stroke} strokeWidth={7} />
          <path d="M120 166 Q150 168 180 166 Q176 206 150 206 Q124 206 120 166 Z" fill={INK} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
          <path d="M134 194 Q150 184 166 194 Q160 203 150 203 Q140 203 134 194 Z" fill="#e86a6a" />
        </g>
      )
    case 'idle':
    default:
      return (
        <g>
          <path d="M100 102 Q116 94 132 100" {...stroke} />
          <path d="M168 100 Q184 94 200 102" {...stroke} />
          <Eye cx={116} cy={136} />
          <Eye cx={184} cy={136} />
          <path d="M132 176 Q150 192 168 176" {...stroke} />
        </g>
      )
  }
}
