import type { ReactNode } from 'react'

/** Sunny classical courtyard backdrop: sky, sun, clouds, marble ledge, terracotta floor. */
export default function Courtyard({ children }: { children: ReactNode }) {
  return (
    <main className="courtyard relative h-screen w-screen overflow-hidden text-[var(--ink)]">
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1280 800" preserveAspectRatio="xMidYMid slice" aria-hidden>
        {/* sun */}
        <circle cx="840" cy="34" r="54" fill="var(--sun)" stroke="var(--ink)" strokeWidth="5" />
        <circle cx="824" cy="18" r="15" fill="#fff4b8" />
        {/* clouds */}
        <Cloud x={70} y={70} s={1} />
        <Cloud x={430} y={150} s={0.7} />
        <Cloud x={930} y={140} s={0.85} />
        {/* distant columns */}
        <Column x={14} />
        <Column x={1226} />
      </svg>
      {/* marble ledge and terracotta floor */}
      <div className="courtyard-ledge pointer-events-none absolute inset-x-0 bottom-[150px] h-[26px]" />
      <div className="courtyard-floor pointer-events-none absolute inset-x-0 bottom-0 h-[150px]" />
      <div className="relative h-full w-full">{children}</div>
    </main>
  )
}

function Cloud({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="#fff" opacity="0.92">
      <ellipse cx="60" cy="40" rx="60" ry="26" />
      <circle cx="40" cy="28" r="26" />
      <circle cx="78" cy="20" r="32" />
      <circle cx="110" cy="38" r="22" />
    </g>
  )
}

function Column({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} 0)`} stroke="var(--ink)" strokeWidth="5" fill="var(--marble)">
      <rect x="-6" y="60" width="52" height="18" rx="4" />
      <rect x="0" y="76" width="40" height="560" />
      <path d="M13 82 V630 M27 82 V630" stroke="var(--marble-vein)" strokeWidth="4" />
    </g>
  )
}
