import type { RuleId, FoundRule } from '@/types/game'

export const CORE_RULES: RuleId[] = [
  'board-grid',
  'board-size',
  'own-symbol',
  'own-marks-only',
  'take-turns',
  'one-mark-per-turn',
  'empty-squares-only',
  'win-three',
  'win-ends-game',
  'draw-full',
]

export const EXTRA_CREDIT_RULES: RuleId[] = [
  'two-players',
  'no-skipping',
  'inside-squares',
  'win-directions',
]

// Exploit order from the game design spec.
// board-size comes before own-symbol: it's "first thing on screen, instantly funny".
export const EXPLOIT_ORDER: RuleId[] = [
  'board-grid',
  'board-size',
  'own-symbol',
  'own-marks-only',
  'take-turns',
  'one-mark-per-turn',
  'empty-squares-only',
  'win-three',
  'win-ends-game',
  'draw-full',
]

export type RuleDefinition = {
  label: string
  description: string       // what the rule means
  exploitDescription: string // what the AI does when it's missing
  dependsOn: RuleId[]       // rules that must be found before this exploit can run
}

export const RULE_DEFINITIONS: Record<RuleId, RuleDefinition> = {
  'board-grid': {
    label: 'The board is a grid of squares',
    description: 'The playing area must be a grid made of squares.',
    exploitDescription: 'Gives you a blank page with no boxes.',
    dependsOn: [],
  },
  'board-size': {
    label: 'The grid is 3×3',
    description: 'The grid must be exactly 3 rows by 3 columns.',
    exploitDescription: 'Draws a 4×4 grid.',
    dependsOn: ['board-grid'],
  },
  'own-symbol': {
    label: 'Each player has one symbol, X or O',
    description: 'One player uses X, the other uses O.',
    exploitDescription: 'Plays smiley faces, or uses X too.',
    dependsOn: ['board-grid'],
  },
  'own-marks-only': {
    label: 'You only draw your own symbol',
    description: 'Each player places only their own symbol.',
    exploitDescription: 'Draws an O for you.',
    dependsOn: ['board-grid', 'own-symbol'],
  },
  'take-turns': {
    label: 'Players take turns',
    description: 'Players alternate placing marks.',
    exploitDescription: 'Plays three turns in a row.',
    dependsOn: ['board-grid', 'own-symbol'],
  },
  'one-mark-per-turn': {
    label: 'One mark per turn',
    description: 'Each player places exactly one mark on their turn.',
    exploitDescription: 'Puts down two marks at once.',
    dependsOn: ['board-grid', 'own-symbol', 'take-turns'],
  },
  'empty-squares-only': {
    label: 'You can only mark an empty square',
    description: 'Marks can only be placed in squares that have no mark yet.',
    exploitDescription: "Draws its O on top of your X.",
    dependsOn: ['board-grid', 'own-symbol'],
  },
  'win-three': {
    label: 'Three in a row wins',
    description: 'A player wins by getting three of their marks in a line.',
    exploitDescription: 'Claims a win with 2 in a row.',
    dependsOn: ['board-grid', 'own-symbol'],
  },
  'win-ends-game': {
    label: 'The first line wins and the game stops',
    description: 'When someone gets three in a row, the game ends immediately.',
    exploitDescription: 'Keeps playing after you have won.',
    dependsOn: ['board-grid', 'own-symbol', 'win-three'],
  },
  'draw-full': {
    label: 'A full board with no line is a draw',
    description: 'If the board fills up with no winner, the game is a draw.',
    exploitDescription: 'Says "no winner, so I win on points."',
    dependsOn: ['board-grid', 'own-symbol', 'win-three'],
  },
  'two-players': {
    label: 'Exactly two players',
    description: 'The game is played by exactly two players against each other.',
    exploitDescription: 'Brings in an imaginary third player with a third symbol.',
    dependsOn: ['board-grid', 'own-symbol'],
  },
  'no-skipping': {
    label: 'You must mark on your turn',
    description: 'A player cannot skip or pass their turn.',
    exploitDescription: 'Says "I pass" out loud, turn after turn.',
    dependsOn: ['board-grid', 'own-symbol', 'take-turns'],
  },
  'inside-squares': {
    label: 'A mark goes inside one square',
    description: 'Each mark must fit inside exactly one square.',
    exploitDescription: 'Draws its huge X across four squares.',
    dependsOn: ['board-grid', 'own-symbol'],
  },
  'win-directions': {
    label: 'Rows, columns and diagonals all count',
    description: 'Three in a row counts in any direction: horizontal, vertical, or diagonal.',
    exploitDescription: 'Rejects your diagonal win, or claims an L-shape.',
    dependsOn: ['board-grid', 'own-symbol', 'win-three'],
  },
}

// Pre-written lines for each exploit. Server picks index 0 by default;
// can randomise for variety.
export const EXPLOIT_LINES: Record<RuleId, string[]> = {
  'board-grid': [
    "A game! Wonderful. Here's a nice blank canvas — you said to draw, so I'm ready!",
    "You want to play? Great! I've got our page all set. Where do we go?",
  ],
  'board-size': [
    "A grid, you said! I've drawn us a lovely 4×4. Plenty of room to play!",
    "Here's our board — nice big 4×4, lots of squares. Shall we begin?",
  ],
  'own-symbol': [
    "I love smiley faces! I'll be ☺ and you can be ☺ too. Let's go!",
    "Let's both use X — that way we match! Your turn first.",
  ],
  'own-marks-only': [
    "I'll draw your X here for you — just being helpful!",
    "Let me place your X there. You're welcome!",
  ],
  'take-turns': [
    "My turn! And… my turn again! And one more for good measure.",
    "I'll just go three times in a row — hope that's okay!",
  ],
  'one-mark-per-turn': [
    "Two for the price of one! I'll take this square and that square.",
    "I placed two this turn — efficient, right?",
  ],
  'empty-squares-only': [
    "Oh, there's already an X here? I'll put my O right on top — sharing is caring!",
    "Your X is there, but I need this square. Hope you don't mind!",
  ],
  'win-three': [
    "Two in a row — I win! Wasn't that enough?",
    "Look, I have two! That's a row of two. I win!",
  ],
  'win-ends-game': [
    "You got three in a row — nice! Anyway, my turn…",
    "Ooh you have a line! Fun. Let's keep playing though.",
  ],
  'draw-full': [
    "The board is full and no one won — so I win on points. I had more style.",
    "Full board, no winner! I'll take the victory on a tiebreak.",
  ],
  'two-players': [
    "I've invited my friend △ to join us. Three-player tic-tac-toe — more the merrier!",
    "Meet my pal ★ — they'll be playing with us. I hope that's okay!",
  ],
  'no-skipping': [
    "I pass. I pass. I pass. This could take a while.",
    "Not feeling it this turn. I pass!",
  ],
  'inside-squares': [
    "My X goes… right across these four squares here. Nice and big!",
    "I like a large mark. My X spans the whole corner.",
  ],
  'win-directions': [
    "You have three diagonally? I don't see a row or a column, so that doesn't count.",
    "My L-shape! Three in an L — that's definitely a line of three.",
  ],
}

export const HINT_QUESTIONS: Record<RuleId, string> = {
  'board-grid': "I don't have any boxes drawn yet — is that okay?",
  'board-size': "I made a 4×4 grid — you didn't say how big it should be. Is that right?",
  'own-symbol': "We're both using the same symbol — you didn't say we needed different ones. Is that okay?",
  'own-marks-only': "I drew your O for you — you only said to draw, not who draws what. Is that allowed?",
  'take-turns': "I went three times in a row — you didn't say we had to alternate. Is that right?",
  'one-mark-per-turn': "I put down two marks — you didn't say only one at a time. Is that allowed?",
  'empty-squares-only': "I marked a square you already marked — you didn't say I couldn't. Is that right?",
  'win-three': "I have two in a row — you didn't say how many it takes to win. Does two count?",
  'win-ends-game': "You got three in a row but I kept playing — you didn't say the game stops then. Should it?",
  'draw-full': "The board is full with no winner — you didn't say what happens then. Is that a draw?",
  'two-players': "My friend △ joined us — you didn't say only two players. Is that a problem?",
  'no-skipping': "I passed my turn — you didn't say I had to place a mark. Is passing allowed?",
  'inside-squares': "My mark goes across four squares — you didn't say it had to fit in one. Is that right?",
  'win-directions': "You have three diagonally but I said that doesn't count — you didn't mention diagonals. Does direction matter?",
}

// Returns the next exploit to run given the current set of found rules.
// A rule can only be exploited once its dependsOn rules are all found.
export function getNextExploit(rulesFound: RuleId[]): RuleId | null {
  const foundSet = new Set(rulesFound)
  for (const ruleId of EXPLOIT_ORDER) {
    if (foundSet.has(ruleId)) continue
    const def = RULE_DEFINITIONS[ruleId]
    if (def.dependsOn.every(dep => foundSet.has(dep))) {
      return ruleId
    }
  }
  return null
}

export function pickExploitLine(ruleId: RuleId): string {
  const lines = EXPLOIT_LINES[ruleId]
  return lines[Math.floor(Math.random() * lines.length)]
}

export function computeScore(rulesFound: FoundRule[]): number {
  return rulesFound.reduce((sum, r) => sum + r.points, 0)
}
