# Teach Me Tic-Tac-Toe — game design

Status: phase 1 (rules and design agreed between the two of us), 2026-10-07.
Next: phase 2, system design (partner). Phase 3: built by coding agents from this spec plus the system design.

## The idea in one paragraph

The player explains tic-tac-toe to an AI by voice. The AI then plays with them as a cheerful
**rules lawyer**: it follows the player's words literally and exploits whatever they left out —
a 4×4 grid, drawing an O for the player, claiming a win with two in a row. Each exploit shows the
player a rule they forgot to say. They fix it by voice, the game replays, and a rules panel on the
right fills in. The point is the "aha": *I thought I was being clear, and I wasn't.*

This is a **demo game** for a hackathon: one screen, one game, a score at the end.

## The AI's personality

- Playful, literal, never mean. It is delighted by loopholes, not smug about them.
- **The fairness test (binding):** an exploit is fair only if an ordinary person, hearing the
  player's exact words, could picture it. A 4×4 grid passes. A four-dimensional grid, a
  non-Euclidean board, wordplay, or anything outside the board and the turns fails.
- **It plays dumb about the name.** "It's tic-tac-toe" earns "Never heard of it! How does it
  work?" and credits no rules. Every rule has to be said.
- **One exploit per round.** It picks the next missing rule (order below) and plays everything
  else straight, so each round teaches one thing.

## The rules checklist

The AI keeps this list hidden and ticks rules off as the player states them.

### Core rules (10) — the game is won when all 10 are found

| id | Rule | What the AI does when it's missing |
|---|---|---|
| `board-grid` | The board is a grid of squares. | Gives you a blank page with no boxes. |
| `board-size` | The grid is 3×3. | Draws a 4×4 (or 5×5) grid. |
| `own-symbol` | Each player has one symbol, X or O, one each. | Plays smiley faces, or uses X too. |
| `own-marks-only` | You only draw your own symbol. | Draws *your* symbol for you, somewhere useless: "I put your X there for you!" |
| `take-turns` | Players take turns. | Plays three turns in a row. |
| `one-mark-per-turn` | One mark per turn. | Puts down two marks at once. |
| `empty-squares-only` | You can only mark an empty square. | Draws its O on top of your X. |
| `win-three` | Three in a row wins (not 2). | Claims a win with 2 in a row. |
| `win-ends-game` | The first line wins and the game stops. | Keeps playing after you've won. |
| `draw-full` | A full board with no line is a draw. | Says "no winner, so I win on points." |

### Extra-credit rules (4) — bonus points, never required

The AI uses these only when the moment comes up naturally (for example, a diagonal win).

| id | Rule | What the AI does when it's missing |
|---|---|---|
| `two-players` | Exactly two players, against each other. | Brings in an imaginary third player with a third symbol. |
| `no-skipping` | You must mark on your turn. | Says "I pass" out loud, turn after turn. |
| `inside-squares` | A mark goes inside one square. | Draws its huge X across four squares. |
| `win-directions` | Rows, columns and diagonals all count. | Rejects your diagonal win, or claims an L-shape. |

### Exploit order

1. `board-size` — first thing on screen, instantly funny, hooks the player.
2. `own-marks-only` — the AI draws your X for you.
3. `take-turns`, `one-mark-per-turn` — double moves.
4. `empty-squares-only` — overwriting.
5. `win-three` — "I win with two!"
6. `win-ends-game`, `draw-full` — end-of-game confusion.

`board-grid` and `own-symbol` are exploited whenever they're missing, since nothing else works
without them. A rule is only exploited once the rules it depends on exist (e.g. `win-three` needs
a grid and symbols).

### Rules we considered and dropped

Board starts empty (nitpicky), who goes first (confusing to build and to play), marks stay put
(annoying), mark shape (pedantic, and the player stamps marks anyway). Also out by the fairness
test: board size in centimetres, time limits, wrap-around or 3D boards, "best of three".

## How a round works

1. **Explain.** The player talks. The AI listens and ticks off any rules the words close.
2. **Play.** The AI draws the board from the current rules and plays, springing **one** exploit.
   The player clicks a square to stamp their own symbol.
3. **Catch.** The player objects ("hey, that's my O!") and states the fix.
4. **Hint, if stuck.** If the player goes the difficulty's hint delay (below) without naming the problem, the AI asks
   in character: *"Ah, so I can put an O in the box you put an X in. Is that right?"*
5. **Fill in.** When the fix closes the loophole, that rule's slot fills in. The round ends and
   a new one starts with the updated rules.

## Difficulty

Chosen on the Setup screen. It changes only the help and the goal; the rules and the AI's
behaviour are the same at every level.

| Level | Hint after | To win |
|---|---|---|
| Easy | 1 stuck turn | the 10 core rules |
| Normal | 2 stuck turns | the 10 core rules (extra credit is a bonus) |
| Hard | never | all 14 rules |

## When the game ends

- **Won:** every rule the difficulty requires is found. The AI plays one clean game, then the
  Result screen appears.
- **Quit:** the player gives up, or presses a key (Esc) to return to the menu. No score.

## Grading a rule

A rule counts as found only when the player's words **close that specific loophole**. Naming the
topic is not enough.

| The player says | Result |
|---|---|
| "It's tic-tac-toe." | Nothing found. |
| "Three in a row wins." | `win-three` found; `win-directions` not. |
| "Three in a row, any direction." | `win-three` and `win-directions` found. |
| "Get three marks to win." | Not yet: the AI wins with three scattered marks. |
| "Take turns drawing X and O." | `take-turns` and `own-symbol` found. |
| "Fill the squares." | Nothing found: overwriting is still allowed. |
| "Play fair" / "don't cheat." | Nothing found. |
| "No" in reply to a hint question | The rule counts as **found with a hint** (lower score). |

One sentence can close several rules ("a 3×3 grid" closes `board-grid` and `board-size`).

## Scoring

The score screen shows: core rules found (x/10), extra credit found, and rounds played (fewer is
better). Proposed points, to tune during play-testing:

- Core rule found unprompted: 10 points. Found after a hint: 5 points.
- Extra-credit rule: 5 points.
- Rounds: shown alongside the points, not subtracted (open — see below).

## Screens

Three screens. Mockups (Play screen, layouts A/B/C — **A chosen**):
https://claude.ai/artifact/Ud7qiQft8x2UtTV2RCT6jr

### 1. Setup
- The one-line how-to: **"Explain tic-tac-toe to an AI that takes everything literally."**
- Player name (used on the Result screen).
- Difficulty: Easy / Normal / Hard.
- Nothing else (no mic check, no symbol choice — the player is X).

### 2. Play — layout A ("Classic")
One screen; the player can talk at any moment, including mid-move.
- **Centre:** the board, large enough to read from the back of a room on a projector.
- **Right:** the rules panel. Empty numbered slots (10, or 14 on Hard) so players can see how many
  are left. A found rule fills in **in the player's own words**, with a tick, and a "hinted" tag
  if it came from a hint. Extra-credit rules appear below as "+ bonus" when found. One sentence
  that closes two rules fills two slots.
- **Bottom:** a conversation strip with the last 2–3 lines (player and AI) and a listening
  indicator.
- **The exploit is shown on the board:** the offending square or mark gets a highlight ring and a
  short tag (e.g. "O drawn on top of your X").
- **Top corner:** player name and difficulty, small. **Esc:** back to the menu.
- **Marking:** the player clicks a square and their X appears instantly.
- **The AI draws.** The grid and the AI's marks appear stroke by stroke, about half a second per
  mark, like someone drawing with a pen. This is presentation only — the game decides the move
  first, the animation just shows it — and it covers the wait for the AI's spoken reply. A
  wobbly hand-drawn line style is optional and the first thing to cut.
- **Voice:** push-to-talk or always-listening is a system-design choice (phase 2).

### 3. Result
Congratulations (won) or commiseration (quit), with the player's name, core rules found (x/10),
extra credit found, rounds played, and points.

## Open for phase 2 (system design)

Not decided here, for the partner's design:

- Voice in and out (speech-to-text, text-to-speech, push-to-talk or not).
- How the AI judges which rules a sentence closed: one model call with the checklist, or separate
  checks per rule.
- How the AI's exploit choice and the board state stay in sync (the AI must not "say" a move the
  board doesn't show).
- What counts as a "round" on the score screen, and whether rounds lower the score.
