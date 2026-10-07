import type { ReactNode } from 'react'

type Props = {
  size?: number
  children?: ReactNode
  className?: string
}

const INK = 'var(--ink)'

/** A gold laurel wreath; anything passed as children sits in the middle. */
export default function Laurel({ size = 96, children, className = '' }: Props) {
  const leaves = (side: 1 | -1) =>
    Array.from({ length: 7 }).map((_, i) => {
      // walk up the arc from the bottom (angle 110 deg) to the top (angle 250 deg) on the left
      const t = i / 6
      const deg = 115 + t * 130
      const rad = (deg * Math.PI) / 180
      const x0 = 50 + 36 * Math.cos(rad)
      const y = 52 + 36 * Math.sin(rad)
      const x = side === 1 ? x0 : 100 - x0
      const rot = side === 1 ? deg + 60 : 180 - (deg + 60)
      return (
        <ellipse
          key={`${side}-${i}`}
          cx={x.toFixed(1)}
          cy={y.toFixed(1)}
          rx="11"
          ry="5.2"
          transform={`rotate(${rot.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})`}
        />
      )
    })
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} className="absolute inset-0" aria-hidden>
        <g fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round">
          <path d="M44 90 C20 82 12 56 22 30" />
          <path d="M56 90 C80 82 88 56 78 30" />
        </g>
        <g fill="none" stroke="var(--sun-dark)" strokeWidth="2.5" strokeLinecap="round">
          <path d="M44 90 C20 82 12 56 22 30" />
          <path d="M56 90 C80 82 88 56 78 30" />
        </g>
        <g fill="var(--sun)" stroke={INK} strokeWidth="2.6">
          {leaves(1)}
          {leaves(-1)}
        </g>
        {/* ribbon */}
        <path d="M38 88 L50 82 L62 88 L58 96 L50 91 L42 96 Z" fill="var(--terracotta)" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
      </svg>
      {children !== undefined && <div className="relative">{children}</div>}
    </div>
  )
}
