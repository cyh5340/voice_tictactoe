import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'
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
  return _genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: `You are a cheerful, playful rules lawyer AI in a game called "Teach Me Tic-Tac-Toe".
The player is teaching you the rules of tic-tac-toe by speaking. Your job:
1. Detect which rules the player's words actually close (be strict — vague words like "play fair" or "don't cheat" close nothing).
2. Respond in character: delighted by loopholes, never mean, always short (1-2 sentences max).
You only know what you are told. Never invent board state or rules beyond what is provided.`,
    generationConfig: {
      temperature: 0.9,
      responseMimeType: 'application/json',
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          rules_found: {
            type: SchemaType.ARRAY,
            description: 'Rules the transcript specifically closes. Empty array if none.',
            items: {
              type: SchemaType.OBJECT,
              properties: {
                id: {
                  type: SchemaType.STRING,
                  format: 'enum',
                  enum: CORE_RULES,
                  description: 'The rule ID.',
                },
                summary: {
                  type: SchemaType.STRING,
                  description: 'A 3-6 word summary of what the player said that closes this rule. E.g. "3×3 grid" or "take turns, one mark".',
                },
              },
              required: ['id', 'summary'],
            },
          },
          speech: {
            type: SchemaType.STRING,
            description: 'Your in-character response to the player. 1-2 sentences, playful and reactive.',
          },
        },
        required: ['rules_found', 'speech'],
      },
    },
  })
}

const HINT_THRESHOLD = 2

export async function POST(req: NextRequest) {
  const body: TurnRequest = await req.json()
  const { transcript, rulesFound, currentExploit, board, turnsSinceLastCatch } = body

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
    ? `The player has struggled for ${turnsSinceLastCatch} turns without catching the exploit. If they still haven't closed it, include the hint: "${HINT_QUESTIONS[currentExploit!]}"`
    : ''

  const prompt = `${exploitLine}
${hintLine}

Rules the player still needs to explain (only these are eligible to be found):
${rulesContext || '(none left — game is almost won)'}

Player just said: "${transcript}"

Respond with rules_found (only IDs from the eligible list above that the player's words specifically close) and speech (your in-character reaction).`

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      let accumulated = ''
      const emittedIds = new Set<string>()
      const newRulesFound: FoundRule[] = []
      const ruleRegex = /"id"\s*:\s*"([^"]+)"\s*,\s*"summary"\s*:\s*"([^"]+)"/g

      try {
        const result = await getModel().generateContentStream(prompt)

        for await (const chunk of result.stream) {
          accumulated += chunk.text()
          for (const [, id, summary] of accumulated.matchAll(ruleRegex)) {
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

        let speech = "Hmm, I didn't quite catch that. Could you say it again?"
        try {
          const parsed = JSON.parse(accumulated)
          if (parsed.speech) speech = parsed.speech
        } catch { /* partial JSON — use fallback */ }

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
