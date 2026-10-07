import type { FoundRule, GameState, RuleId } from '@/types/game'
import Board from './Board'
import Courtyard from './Courtyard'
import Laurel from './Laurel'
import Mascot, { type MascotExpression } from './Mascot'
import RulesTablet from './RulesTablet'
import SpeechBubble from './SpeechBubble'
import TalkButton from './TalkButton'

type Props = {
  game: GameState
  gridSize: number
  coreRules: RuleId[]
  extraFound: FoundRule[]
  aiSpeech: string
  playerTranscript: string
  isRecording: boolean
  isProcessing: boolean
  expression: MascotExpression
  canClickCell: (row: number, col: number) => boolean
  onCellClick: (row: number, col: number) => void
  ghostX?: Array<[number, number]>
}

export default function PlayScreen({
  game, gridSize, coreRules, extraFound, aiSpeech, playerTranscript,
  isRecording, isProcessing, expression, canClickCell, onCellClick, ghostX,
}: Props) {
  return (
    <Courtyard>
      {/* top strip */}
      <header className="absolute inset-x-0 top-0 flex items-start justify-between px-[72px] pt-4">
        <h1 className="chunky text-[44px] leading-none text-[var(--sun)]">Teach to Learn</h1>
        <div className="flex items-center gap-3">
          <span className="chunky-sm text-[26px] leading-none text-white">Round {game.roundsPlayed}</span>
          <Laurel size={78}>
            <span className="chunky-sm block pt-1 text-[26px] leading-none text-white">{game.totalScore}</span>
          </Laurel>
        </div>
      </header>

      <div className="grid h-full grid-cols-[270px_minmax(0,1fr)_300px] gap-7 px-[72px] pb-5 pt-[96px]">
        {/* the pupil and what it says */}
        <div className="flex min-h-0 flex-col items-center justify-end gap-9 pb-1">
          <SpeechBubble text={aiSpeech} />
          <div className="bob shrink-0">
            <Mascot expression={expression} size={250} />
          </div>
        </div>

        {/* the board */}
        <div className="flex min-h-0 flex-col items-center">
          <div style={{ width: 'min(100%, calc(100vh - 300px))' }}>
            <Board
              board={game.board}
              gridSize={gridSize}
              canClick={canClickCell}
              onCellClick={onCellClick}
              ghostX={ghostX}
            />
          </div>
          <div className="mt-auto flex flex-col items-center gap-3">
            <p className="h-[34px] max-w-[600px] truncate px-1 leading-[28px] chunky-sm text-[20px] text-white">
              {playerTranscript && <>You: “{playerTranscript}”</>}
            </p>
            <TalkButton isRecording={isRecording} isProcessing={isProcessing} />
            <p className="mt-1 text-[15px] font-bold text-white [text-shadow:0_1px_0_var(--ink)]">
              {game.status === 'explaining' && 'Explain the rules of tic-tac-toe'}
              {game.status === 'playing' && 'Click a square to place your X, or hold SPACE to speak'}
              {game.status === 'catching' && 'Spot the rule the AI broke? Hold SPACE and say it!'}
              <span className="ml-3 font-semibold opacity-80">Esc to quit</span>
            </p>
          </div>
        </div>

        {/* wax tablet */}
        <div className="min-h-0 pb-3">
          <RulesTablet coreRules={coreRules} rulesFound={game.rulesFound} extraFound={extraFound} />
        </div>
      </div>
    </Courtyard>
  )
}
