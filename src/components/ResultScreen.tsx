import Courtyard from './Courtyard'
import Laurel from './Laurel'
import Mascot from './Mascot'

type Props = {
  won: boolean
  coreCount: number
  extraCount: number
  totalScore: number
  roundsPlayed: number
  onPlayAgain: () => void
}

/** Wreaths earned: 3 for teaching every rule, 2 for at least half, else 1. */
function wreathCount(won: boolean, coreCount: number) {
  if (won) return 3
  return coreCount >= 5 ? 2 : 1
}

export default function ResultScreen({ won, coreCount, extraCount, totalScore, roundsPlayed, onPlayAgain }: Props) {
  const wreaths = wreathCount(won, coreCount)
  return (
    <Courtyard>
      <div className="flex h-full items-center justify-center gap-14 px-16 pb-10">
        <div className="bob shrink-0 self-end pb-6">
          <Mascot expression={won ? 'happy' : 'idle'} size={300} />
        </div>

        <div className="flex max-w-[640px] flex-col items-center gap-6">
          <h1 className="chunky text-center text-[60px] leading-[1.05] text-[var(--sun)]">
            {won ? 'You taught me tic-tac-toe!' : 'Maybe next time…'}
          </h1>

          <div className="flex items-end gap-2" aria-label={`${wreaths} of 3 laurel wreaths`}>
            {[0, 1, 2].map(i => (
              <Laurel
                key={i}
                size={i === 1 ? 128 : 100}
                className={i < wreaths ? '' : 'opacity-30 grayscale'}
              />
            ))}
          </div>

          <dl className="marble-slab grid grid-cols-4 gap-2 px-6 pb-6 pt-4">
            <Stat label="Core rules" value={`${coreCount}/10`} />
            <Stat label="Extra credit" value={String(extraCount)} />
            <Stat label="Points" value={String(totalScore)} />
            <Stat label="Rounds" value={String(roundsPlayed)} />
          </dl>

          <button onClick={onPlayAgain} className="glossy mt-2 h-[78px] px-14" data-tone="terracotta">
            <span className="chunky-sm relative text-[32px] text-white">Play again</span>
          </button>
        </div>
      </div>
    </Courtyard>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-[120px] flex-col items-center">
      <dt className="text-[16px] font-extrabold uppercase tracking-wider text-[#7a6f5c]">{label}</dt>
      <dd className="font-display text-[48px] leading-none text-[var(--med-blue)]">{value}</dd>
    </div>
  )
}
