type Props = {
  text: string
}

/** The pupil's speech bubble; its tail points down to the mascot's head. */
export default function SpeechBubble({ text }: Props) {
  return (
    <div className="relative" aria-live="polite">
      <div key={text} className="speech bubble-pop px-6 py-4">
        <p className="text-[23px] font-extrabold leading-[1.25] text-[var(--ink)]">{text}</p>
      </div>
      {/* tail */}
      <svg viewBox="0 0 60 40" width="60" height="40" className="absolute -bottom-[31px] left-[42%]" aria-hidden>
        <path d="M4 0 L30 34 L46 0" fill="#fff" stroke="var(--ink)" strokeWidth="5" strokeLinejoin="round" />
        <rect x="0" y="-6" width="56" height="10" fill="#fff" />
      </svg>
    </div>
  )
}
