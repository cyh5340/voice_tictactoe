# Pitch — Teach to Learn

5 minutes all in: talk over slides, then a live demo. About 1¼ minutes of talking, about
3½ minutes of demo. The game design is in
[the spec](superpowers/specs/2026-10-07-voice-tictactoe-design.md).

## Talk track

> Hi, we're team **Teach to Learn**.
>
> People learn best by teaching. Two thousand years ago, the Roman philosopher Seneca wrote
> *docendo discimus*: by teaching, we learn. In 2014, researchers found that just *expecting* to
> teach something made people remember more, and remember it in a better-organised way.
>
> So we built a game where the AI is the student and you're the teacher. In teaching it, you
> discover what you don't know. Psychologists call this the illusion of explanatory depth: you
> think you understand something until you try to explain it.
>
> Let's jump into the demo.
>
> **[Live demo — script below]**
>
> The bigger picture: this same loop works for explaining anything. Photosynthesis, a sales
> pitch, even your own code.
>
> The best way to find out what you know is to teach it — so we built you a student.

While the demo runs: *"Every slot on the right is something she thought she'd said."*

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

## Demo script

The partner plays X, on **Easy** (hint after 1 stuck turn, so step 9 triggers it), following this loosely. It reaches **8 of 10 core rules** in
about 3 minutes and shows each kind of moment once: a plain exploit, a hint, a fix.

This script is also the **end-to-end acceptance test for the build**: if the game cannot play
these 12 steps, it is not demo-ready.

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
