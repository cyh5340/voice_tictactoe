# Teach Me Tic-Tac-Toe — system design

Status: phase 2 complete, 2026-10-07.
Next: phase 3, build from phase 1 + phase 2 specs.

## Stack

| Concern | Tool | Reason |
|---|---|---|
| Framework | Next.js 14 (App Router), TypeScript | Vercel-native, API routes co-located |
| STT | Fish Audio `transcribe-1-pro` | Hackathon requirement |
| TTS | Fish Audio `s2.1-pro` | Hackathon requirement |
| Game logic | Jev (TypeSafe AI System One model) | Structured, typed decisions — no text generation needed |
| AI spoken lines | Pre-written templates (keyed by exploit) | 14 finite exploits, one-time each; templates are more reliable than generative text for board-synced lines |
| All game state | React (browser) | Single-session demo, no cross-session needs |
| API key proxy | Vercel serverless functions | Keep Fish Audio + Jev keys off the client |
| Database | None | Eliminated — see rationale below |

## Why no database

Supabase was considered and dropped:

- **AI memory layer**: eliminated — Jev + pre-written lines require no LLM conversation history.
- **Session state**: lives in React. Client sends current state with every API request; server is fully stateless.
- **Score / rules panel**: React state, displayed at end of game.

A page refresh loses the game. Acceptable for a hackathon demo played in one sitting.

## Voice I/O: push-to-talk

Player holds **spacebar** → browser records audio (MediaRecorder API) → release → POST to `/api/stt`.

Reasons: no VAD complexity, no accidental triggers during TTS playback, unambiguous UX.

## Per-turn flow

```
Player holds spacebar, speaks, releases
  │
  ▼
POST /api/stt { audio: Blob }
  → Fish Audio STT
  → { transcript: string }
  │
  ▼
POST /api/turn {
    transcript,
    rulesFound: string[],      // client owns this
    currentExploit: string,    // client owns this
    board: string[][],
    roundsPlayed: number
  }
  → Jev call:
      Q: which rules (from the not-yet-found list) did this transcript close? → string[]
      Q: is a hint due? (client sends turns_without_catch counter) → bool
      Q: given rulesFound + exploit order, what is the next exploit? → string
  → look up pre-written lines for exploit / rules-found moment
  → return {
      rulesFound: string[],          // newly found this turn
      playerWords: Record<string,string>, // player's exact words per rule (for rules panel)
      nextExploit: string,
      aiMoves: { square: [number,number] | null, speech: string }[],
      hintQuestion: string | null
    }
  │
  ▼
POST /api/tts { text: string }
  → Fish Audio TTS (streaming)
  → audio stream
```

## Board ↔ speech sync

The server returns AI moves as an **ordered array**. The client executes them sequentially: play speech audio, render board move simultaneously, wait for audio to finish, advance to next move. No race conditions.

```ts
aiMoves: [
  { square: [1, 1], speech: "I'll go here..." },
  { square: [0, 0], speech: "...and I'll draw your O here too!" },
  { square: null,   speech: "Your turn!" }
]
```

`square: null` means the AI is speaking without placing a mark (e.g. reacting to a player move).

## API routes

All routes are Vercel serverless functions. Fish Audio and Jev API keys live in Vercel env vars only.

```
POST /api/stt        body: FormData { audio: Blob }     → { transcript: string }
POST /api/tts        body: { text: string }             → streaming audio (Edge Runtime)
POST /api/turn       body: (see above)                  → { rulesFound, playerWords,
                                                            nextExploit, aiMoves,
                                                            hintQuestion }
```

`/api/tts` uses **Vercel Edge Runtime** for streaming support. The other two use Node runtime.

## Jev call design

One Jev call per turn with multiple typed questions:

```ts
const result = await jev.evaluate({
  state: {
    transcript,
    notYetFoundRules: RULE_DEFINITIONS.filter(r => !rulesFound.includes(r.id)),
    currentExploit,
    turnsSinceLastCatch,
  },
  questions: {
    rulesClosedByTranscript: choice(notYetFoundRules.map(r => r.id), { multi: true }),
    hintDue: choice(["yes", "no"]),
    nextExploit: choice(EXPLOIT_ORDER.filter(id => !rulesFound.includes(id))),
  }
})
```

## Pre-written line templates

Each exploit has 2–3 lines. The server picks one (deterministically or randomly). Lines reference the move being made so they stay in sync with the board.

```ts
const EXPLOIT_LINES: Record<string, string[]> = {
  "board-size": [
    "A grid, you said! I've drawn us a lovely 4×4. Plenty of room!",
    "Here's our board — nice big 4×4, lots of space to play!",
  ],
  "own-marks-only": [
    "I'll draw your O here for you — just being helpful!",
    "Let me place your O there. You're welcome!",
  ],
  "win-three": [
    "Two in a row — I win! Was that not enough?",
    "Look, I have two! That's a row of two. I win!",
  ],
  // ... one entry per exploit id
}
```

## Client state shape

```ts
type GameState = {
  status: "explaining" | "playing" | "catching" | "won" | "quit"
  rulesFound: {
    id: string
    playerWords: string
    hintUsed: boolean
    points: number
  }[]
  currentExploit: string | null
  board: ("X" | "O" | null)[][]
  roundsPlayed: number
  totalScore: number
  turnsSinceLastCatch: number
}
```

## Scoring (from phase 1)

- Core rule found unprompted: 10 pts
- Core rule found after hint: 5 pts
- Extra-credit rule: 5 pts
- Rounds played: displayed alongside points, not subtracted

## Latency budget

| Step | Estimate |
|---|---|
| Fish Audio STT | 300–500 ms |
| Jev turn call | 100–200 ms |
| Template lookup | < 1 ms |
| Fish Audio TTS first chunk | ~200 ms |
| **Total to first audio** | **~600–900 ms** |

Turn-based game — comfortable.

## Open questions resolved (from phase 1)

| Question | Decision |
|---|---|
| Push-to-talk or always-listening? | Push-to-talk (spacebar) |
| One LLM call or per-rule checks? | One Jev call, multiple typed questions |
| Board ↔ speech sync? | Pre-computed ordered move array, sequential client execution |
| Do rounds reduce score? | No — displayed only, not subtracted |
