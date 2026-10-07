import { TypeSafeClient, noul } from '@typesafe-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import type { TurnRequest, TurnResponse, FoundRule, RuleId, AiMove } from '@/types/game'
import {
  CORE_RULES,
  RULE_DEFINITIONS,
  HINT_QUESTIONS,
  getNextExploit,
  pickExploitLine,
} from '@/lib/rules'

const HINT_THRESHOLD = 2

let _jev: TypeSafeClient | null = null
function getJev() {
  if (!_jev) _jev = new TypeSafeClient()
  return _jev
}

export async function POST(req: NextRequest) {
  const body: TurnRequest = await req.json()
  const { transcript, rulesFound, currentExploit, turnsSinceLastCatch } = body

  // Rules eligible to check: unfound and all dependencies satisfied
  const foundSet = new Set(rulesFound)
  const checkableRules = CORE_RULES.filter(ruleId => {
    if (foundSet.has(ruleId)) return false
    return RULE_DEFINITIONS[ruleId].dependsOn.every(dep => foundSet.has(dep))
  })

  const newRulesFound: FoundRule[] = []

  if (checkableRules.length > 0 && transcript.trim()) {
    const questions = Object.fromEntries(
      checkableRules.map(ruleId => {
        const def = RULE_DEFINITIONS[ruleId]
        return [
          ruleId,
          noul({
            rule: def.label,
            loophole: def.exploitDescription,
            question: `Did the player's words mean that: "${def.description}"? The words must specifically prevent this exploit: "${def.exploitDescription}".`,
          }),
        ]
      })
    )

    const result = await getJev().systemOne({ state: { transcript }, questions })

    for (const ruleId of checkableRules) {
      const answer = result.answers[ruleId]
      if (answer.noul > 0.5) {
        const hintUsed = ruleId === currentExploit && turnsSinceLastCatch >= HINT_THRESHOLD
        newRulesFound.push({
          id: ruleId as RuleId,
          playerWords: transcript,
          hintUsed,
          points: hintUsed ? 5 : 10,
        })
      }
    }
  }

  const allFoundIds = [...rulesFound, ...newRulesFound.map(r => r.id)]
  const nextExploit = getNextExploit(allFoundIds)
  const gameWon = nextExploit === null

  const hintDue =
    !gameWon &&
    currentExploit !== null &&
    !newRulesFound.some(r => r.id === currentExploit) &&
    turnsSinceLastCatch >= HINT_THRESHOLD

  const hintQuestion = hintDue ? HINT_QUESTIONS[currentExploit!] : null

  const aiMoves = buildAiMoves(
    newRulesFound,
    nextExploit,
    currentExploit,
    gameWon,
    hintQuestion
  )

  const response: TurnResponse = {
    newRulesFound,
    nextExploit,
    aiMoves,
    hintQuestion,
    gameWon,
  }

  return NextResponse.json(response)
}

function buildAiMoves(
  newRulesFound: FoundRule[],
  nextExploit: RuleId | null,
  currentExploit: RuleId | null,
  gameWon: boolean,
  hintQuestion: string | null
): AiMove[] {
  if (gameWon) {
    return [{ square: null, speech: "You've covered everything! I can't find a single loophole. Let's play a clean game!" }]
  }

  if (hintQuestion) {
    return [{ square: null, speech: hintQuestion }]
  }

  if (newRulesFound.length > 0) {
    const fixed = newRulesFound.map(r => RULE_DEFINITIONS[r.id].label).join(' and ')
    const moves: AiMove[] = [{ square: null, speech: `Got it — ${fixed}!` }]
    // If we're moving to a new exploit, give the opening taunt
    if (nextExploit && nextExploit !== currentExploit) {
      moves.push({ square: null, speech: pickExploitLine(nextExploit) })
    }
    return moves
  }

  // Player spoke but closed nothing — encourage them to keep going
  return [{ square: null, speech: "Interesting… but I think there might still be a loophole. Keep going!" }]
}
