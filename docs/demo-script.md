# Demo script

The 3-minute live demo for the pitch ([pitch.md](pitch.md)).

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
