import type { FoundRule, RuleId } from '@/types/game'

type Props = {
  coreRules: RuleId[]
  rulesFound: FoundRule[]
  extraFound: FoundRule[]
}

/** A wax writing tablet: wooden frame, dark wax, rules scratched in the player's own words. */
export default function RulesTablet({ coreRules, rulesFound, extraFound }: Props) {
  const coreCount = coreRules.filter(id => rulesFound.some(r => r.id === id)).length
  return (
    <section className="tablet-frame flex h-full min-h-0 rotate-[1.2deg] flex-col px-3 pb-4 pt-2" aria-label="Rules found">
      <header className="flex items-baseline justify-between px-2 pb-2">
        <h2 className="chunky-sm text-[28px] leading-none text-white">Rules</h2>
        <span className="chunky-sm text-[22px] leading-none text-[var(--sun)]">{coreCount}/10</span>
      </header>

      <div className="tablet-wax min-h-0 flex-1 overflow-y-auto px-3 py-2">
        <ol>
          {coreRules.map((ruleId, i) => {
            const found = rulesFound.find(r => r.id === ruleId)
            return (
              <li key={ruleId} className="wax-groove flex items-start gap-2.5 py-[6px]">
                <span
                  className={[
                    'font-display w-7 shrink-0 text-right text-[22px] leading-[26px]',
                    found ? 'scratched' : 'text-[rgba(255,255,255,0.16)]',
                  ].join(' ')}
                >
                  {i + 1}
                </span>
                {found ? (
                  <div key={found.summary} className="scratch-in min-w-0 flex-1">
                    <p className="scratched break-words text-[19px] font-extrabold leading-[24px]">
                      {found.summary}
                      {found.hintUsed && <HintScratch />}
                    </p>
                    <YourWords words={found.playerWords} points={found.points} />
                  </div>
                ) : (
                  <span className="min-w-0 flex-1" aria-label="not found yet" />
                )}
                {found && <Tick />}
              </li>
            )
          })}
        </ol>

        {extraFound.length > 0 && (
          <div className="mt-3">
            <p className="font-display scratched text-[18px] tracking-wide">+ bonus</p>
            <ul>
              {extraFound.map(r => (
                <li key={r.id} className="wax-groove scratch-in flex items-start gap-2.5 py-[6px]">
                  <Sprig />
                  <div className="min-w-0 flex-1">
                    <p className="scratched break-words text-[18px] font-extrabold leading-[23px]">
                      {r.playerWords}
                    </p>
                    <p className="scratched text-[13px] font-bold opacity-70">+{r.points} pts</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}

/** The player's full words, folded away under the summary; click to unfold. Plus the rule's points. */
function YourWords({ words, points }: { words: string; points: number }) {
  return (
    <details className="wax-words group mt-0.5">
      <summary className="scratched flex cursor-pointer select-none list-none items-center gap-1.5 text-[13px] font-bold opacity-70 hover:opacity-100">
        <svg viewBox="0 0 10 10" width="9" height="9" className="transition-transform group-open:rotate-90" aria-hidden>
          <path d="M3 1.5 L7.5 5 L3 8.5" fill="none" stroke="var(--scratch)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        your words
        <span className="ml-auto pr-0.5 tabular-nums">{points} pts</span>
      </summary>
      <p className="scratched mt-1 break-words border-l-2 border-[rgba(242,217,166,0.35)] pl-2 text-[14px] font-semibold italic leading-[19px] opacity-85">
        “{words}”
      </p>
    </details>
  )
}

/** A tick scratched into the wax. */
function Tick() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" className="mt-0.5 shrink-0" aria-hidden>
      <path d="M3 13 L9 19 L21 5" fill="none" stroke="rgba(0,0,0,0.55)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" transform="translate(0 1)" />
      <path d="M3 13 L9 19 L21 5" fill="none" stroke="var(--scratch)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Hinted rule: three short stylus scratches after the words, plus a quiet word. */
function HintScratch() {
  return (
    <span className="ml-1.5 inline-flex items-center gap-1 align-middle" title="found with a hint">
      <svg viewBox="0 0 22 14" width="20" height="13" aria-hidden>
        <g stroke="var(--scratch)" strokeWidth="2.2" strokeLinecap="round" opacity="0.85">
          <path d="M3 12 L7 2" />
          <path d="M9 12 L13 2" />
          <path d="M15 12 L19 2" />
        </g>
      </svg>
      <span className="text-[14px] font-semibold italic opacity-75">hinted</span>
    </span>
  )
}

/** A little laurel sprig for bonus rules. */
function Sprig() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" className="mt-0.5 ml-1 shrink-0" aria-hidden>
      <path d="M4 21 C10 15 14 9 20 3" fill="none" stroke="var(--scratch)" strokeWidth="2" strokeLinecap="round" />
      <g fill="var(--scratch)">
        <ellipse cx="9" cy="14" rx="4" ry="2" transform="rotate(-70 9 14)" />
        <ellipse cx="13" cy="15" rx="4" ry="2" transform="rotate(10 13 15)" />
        <ellipse cx="13" cy="9" rx="4" ry="2" transform="rotate(-70 13 9)" />
        <ellipse cx="17" cy="10" rx="4" ry="2" transform="rotate(10 17 10)" />
      </g>
    </svg>
  )
}
