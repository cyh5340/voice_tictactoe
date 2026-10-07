# Teach to Learn — the presentation

The whole 5 minutes, start to finish: what you say, when the demo starts, what your partner does
in the game, and how it ends. Read the **Say** lines aloud as written.

**Roles:** *Presenter* talks. *Player* (your partner) plays X in the game, on **Easy**.
**Before you start:** game open and reloaded, mic allowed in the browser, both keys working.

---

## 1. Opening — 0:00 to 0:40

**Say:**

> Hi, we're team **Teach to Learn**.
>
> People learn best by teaching. Two thousand years ago, the Roman philosopher Seneca wrote
> *docendo discimus*: by teaching, we learn. In 2014, researchers found that just *expecting* to
> teach something made people remember more, and remember it in a better-organised way.

## 2. The idea — 0:40 to 1:10

**Say:**

> So we built a game where the AI is the student and you're the teacher. In teaching it, you
> discover what you don't know. Psychologists call this the illusion of explanatory depth: you
> think you understand something until you try to explain it.
>
> Let's jump into the demo.

## 3. Live demo — 1:10 to 4:00

The Player follows these steps loosely. The AI never says what rule was missing — the Player
has to object ("Hey!") and say the rule. Step 9 is a deliberate stall so the audience sees a hint.

**Presenter, while it runs** (once, around step 5): *"Every slot on the right is something they
thought they'd said."*

| # | Partner says / does | AI does | Rules panel |
|---|---|---|---|
| 1 | "Let's play tic-tac-toe." | "Never heard of it! How does it work?" | — |
| 2 | "You draw a grid, and we take turns putting X's and O's in it. I'm X." | Draws a **4×4 grid**. "Here's our grid!" | grid, take turns, symbols |
| 3 | "Hey, not like that!" → AI: "Oh? Why not?" → "It's 3 by 3." | Redraws a 3×3 grid. | + 3×3 |
| 4 | Clicks the centre square | Draws an **X** in a corner: "I put your X there for you!" | — |
| 5 | "You only ever draw your own mark — the O." | "Ah, OK." | + own mark only |
| 6 | Clicks a square | Draws **two O's** at once. | — |
| 7 | "Hey!" → AI: "Oh? Why not?" → "One mark per turn!" | Plays a single O. | + one per turn |
| 8 | Clicks a square | Draws its O **on top of** the partner's X. | — |
| 9 | *Looks puzzled on purpose*: "Hmm… OK, I guess." (a stuck turn) | Hint: "So I can put my O in a box that already has your X. Is that right?" | — |
| 10 | "No — only empty squares." | "Got it." | + empty squares *(hinted)* |
| 11 | Clicks a square | Gets 2 in a row: "**I win!**" | — |
| 12 | "You need three in a row to win." | "Oh! Then we're still going." | + three in a row → **8/10** |

Rules found by the end: `board-grid`, `take-turns`, `own-symbol`, `board-size`,
`own-marks-only`, `one-mark-per-turn`, `empty-squares-only` (hinted), `win-three`.

## 4. The bigger picture — 4:00 to 4:40

**Say:**

> The bigger picture: this same loop works for explaining anything. Photosynthesis, a sales
> pitch, even your own code.

## 5. Close — 4:40 to 5:00

**Say:**

> The best way to find out what you know is to teach it — so we built you a student.

Leave the game's score screen up while you say it.

---

## If something breaks

- **The AI mishears:** the Player repeats the line, slower. Presenter: *"It's a very literal student."*
- **Voice is down entirely:** skip to section 4 and describe what would have happened.

## Sources (check before presenting)

- Seneca, *Epistulae Morales* 7.8: "homines dum docent discunt" (people learn while they teach).
  Not Aristotle.
- Nestojko, Bui, Kornell & Bjork (2014), "Expecting to teach enhances learning and organization
  of knowledge in free recall of text passages", *Memory & Cognition*. A behavioural recall
  study — no brain imaging, so don't say "the brain processes…".
- Rozenblit & Keil (2002), "The misunderstood limits of folk science: an illusion of explanatory
  depth", *Cognitive Science*.
- Background, if asked: Chase, Chin, Oppezzo & Schwartz (2009), teachable agents and the
  "protégé effect" (Stanford, Betty's Brain) — students work harder teaching a computer character
  than learning for themselves.

All four are cited from memory; confirm them before they go on a slide.

---

The demo steps above are also the **end-to-end check for the build**: if the game can't play
them, it isn't demo-ready. Game design: [the spec](superpowers/specs/2026-10-07-voice-tictactoe-design.md).
