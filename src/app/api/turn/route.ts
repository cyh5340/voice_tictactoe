import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest } from 'next/server'
import type { TurnRequest, FoundRule, RuleId, AiMove } from '@/types/game'
import {
  CORE_RULES,
  RULE_DEFINITIONS,
  HINT_QUESTIONS,
  getNextExploit,
} from '@/lib/rules'
import { getExploitMoves } from '@/lib/board'

let _genAI: GoogleGenerativeAI | null = null
function getModel() {
  if (!_genAI) _genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  // No responseSchema — plain text streams token-by-token; JSON schema buffers the full response first.
  return _genAI.getGenerativeModel({
    model: 'gemini-3.8-flash',
    systemInstruction: `You are a cheerful, playful rules lawyer AI in a game called "Teach Me Tic-Tac-Toe".
The player is teaching you the rules of tic-tac-toe by speaking across multiple turns. Your job:
1. Detect which rules are now closed, considering the player's ENTIRE explanation so far (all turns combined, not just the latest). Be strict — vague words like "play fair" or "don't cheat" close nothing, but credit accumulates across turns.
2. Respond in character: delighted by loopholes, never mean. ONE short sentence only — 10 words max. React to what the player said; never describe or announce board moves.
You only know what you are told. Never invent board state or rules beyond what is provided.`,
    generationConfig: { temperature: 0.9 },
  })
}

const HINT_THRESHOLD = 2

export async function POST(req: NextRequest) {
  const body: TurnRequest = await req.json()
  const { transcript, rulesFound, currentExploit, board, turnsSinceLastCatch, conversationLog } = body

  const foundSet = new Set(rulesFound)
  const checkableRules = CORE_RULES.filter(id => !foundSet.has(id))

  const hintDue = currentExploit !== null && turnsSinceLastCatch >= HINT_THRESHOLD

  const rulesContext = checkableRules.map(id => {
    const def = RULE_DEFINITIONS[id]
    return `• ${id}: "${def.label}" — without it, I could: ${def.exploitDescription}`
  }).join('\n')

  const exploitLine = currentExploit
    ? `Active exploit this round: "${RULE_DEFINITIONS[currentExploit].exploitDescription}"`
    : 'No active exploit yet — the player is still explaining the basics.'

  const hintLine = hintDue
    ? `The player has struggled for ${turnsSinceLastCatch} turns without catching the exploit. If they still haven't closed it, end your SPEECH with the hint question: "${HINT_QUESTIONS[currentExploit!]}"`
    : ''

  const priorContext = conversationLog && conversationLog.length > 0
    ? `What the player has said earlier this session:\n${conversationLog.map(t => `- "${t}"`).join('\n')}\n\n`
    : ''

  const prompt = `${exploitLine}
${hintLine}

Rules the player still needs to explain (ONLY these rule IDs are valid):
${rulesContext || '(none left — game is almost won)'}

${priorContext}Player just said: "${transcript}"

Evaluate rules based on the FULL conversation above (all prior turns + this turn combined).

Output format — follow it exactly:
1. For each rule from the list above that the player's words specifically close, output one line:
   RULE: <rule-id> | <3-6 word summary of what they said>
2. Then output your in-character reaction (1-2 sentences) on a line starting with:
   SPEECH: <your response>

If no rules were closed, skip the RULE lines and go straight to SPEECH.

Example:
RULE: board-size | exactly three by three
SPEECH: Oh, so specific! I've been using a 4×4 this whole time!`

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      const emittedIds = new Set<string>()
      const newRulesFound: FoundRule[] = []
      // lineBuffer accumulates a partial line until a newline arrives
      let lineBuffer = ''
      let fullText = ''

      try {
        const result = await getModel().generateContentStream(prompt)

        for await (const chunk of result.stream) {
          const text = chunk.text()
          fullText += text
          lineBuffer += text

          // Process all complete lines; keep the last (possibly incomplete) fragment
          const lines = lineBuffer.split('\n')
          lineBuffer = lines.pop() ?? ''

          for (const line of lines) {
            const m = line.match(/^RULE:\s*(\S+)\s*\|\s*(.+?)\s*$/)
            if (!m) continue
            const [, id, summary] = m
            if (emittedIds.has(id) || !checkableRules.includes(id as RuleId)) continue
            emittedIds.add(id)
            const rule: FoundRule = {
              id: id as RuleId,
              summary,
              playerWords: transcript,
              hintUsed: id === currentExploit && turnsSinceLastCatch >= HINT_THRESHOLD,
              points: id === currentExploit && turnsSinceLastCatch >= HINT_THRESHOLD ? 5 : 10,
            }
            newRulesFound.push(rule)
            send({ type: 'rule', rule })
          }
        }

        // Check remaining lineBuffer for a RULE line too
        const m = lineBuffer.match(/^RULE:\s*(\S+)\s*\|\s*(.+?)\s*$/)
        if (m) {
          const [, id, summary] = m
          if (!emittedIds.has(id) && checkableRules.includes(id as RuleId)) {
            emittedIds.add(id)
            const rule: FoundRule = {
              id: id as RuleId,
              summary,
              playerWords: transcript,
              hintUsed: id === currentExploit && turnsSinceLastCatch >= HINT_THRESHOLD,
              points: id === currentExploit && turnsSinceLastCatch >= HINT_THRESHOLD ? 5 : 10,
            }
            newRulesFound.push(rule)
            send({ type: 'rule', rule })
          }
        }

        const speechMatch = (fullText + lineBuffer).match(/^SPEECH:\s*(.+)$/m)
        // Gemini sometimes echoes the label on the same line: "...text?SPEECH: ...text?"
        // Strip everything from the second SPEECH: onwards.
        const speech = (speechMatch ? speechMatch[1] : '')
          .replace(/\s*SPEECH:.*$/i, '')
          .trim() || "Hmm, I didn't quite catch that. Could you say it again?"

        const allFoundIds = [...rulesFound, ...newRulesFound.map(r => r.id)]
        const nextExploit = getNextExploit(allFoundIds)
        const gameWon = nextExploit === null

        const hintQuestion =
          hintDue && !newRulesFound.some(r => r.id === currentExploit)
            ? HINT_QUESTIONS[currentExploit!]
            : null

        const aiMoves: AiMove[] = [{ square: null, speech }]
        if (!gameWon && nextExploit && nextExploit !== currentExploit) {
          aiMoves.push(...getExploitMoves(nextExploit, board))
        }

        send({ type: 'done', nextExploit, hintQuestion, gameWon, aiMoves })
      } catch (err) {
        console.error('[turn] Gemini call failed:', err)
        send({
          type: 'done',
          nextExploit: currentExploit,
          hintQuestion: null,
          gameWon: false,
          aiMoves: [{ square: null, speech: "Hmm, I didn't quite catch that. Could you say it again?" }],
        })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
