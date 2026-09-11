# Waffle by Michael O'Sullivan

A clone of [Waffle](https://wafflegame.net/), the word sliding game, built with
Vite and React and styled with the green and black palette from
[Wordle Social](https://wordle-social.vercel.app/).

## Quick start

```sh
npm install
npm run dev       # http://localhost:5173
```

| Script             | What it does                                        |
| ------------------ | --------------------------------------------------- |
| `npm run dev`      | Vite dev server with hot reload.                    |
| `npm run build`    | Production build into `dist/`.                      |
| `npm run preview`  | Serve the built output locally.                     |
| `npm test`         | Vitest: board logic, every puzzle, and the UI.      |
| `npm run lint`     | oxlint.                                             |
| `npm run generate` | Rebuild `src/lib/puzzles.js` (needs Python 3).      |

`dist/` is a static bundle, so it deploys to Vercel, Netlify or any static host
with no configuration.

## The game

The board is a 5×5 grid with the four inner corner tiles missing, leaving 21
letters. Rows 0, 2 and 4 and columns 0, 2 and 4 each have to spell a word, so
there are six words to find in total. The tiles in between sit on the outer edge
of the board and belong to just one of those six words.

Drag a letter anywhere and the two tiles swap. Tiles are coloured as you go:

| Colour | Meaning                                                        |
| ------ | -------------------------------------------------------------- |
| Green  | Correct letter in the correct place. Locked, so it cannot move. |
| Yellow | In one of the words that tile belongs to, but in a different place. |
| Plain  | Not in any of the words for that tile.                          |

Every board can be solved in **10 swaps** and you are given **15**, so a perfect
game earns five stars — one for each swap left over. Run out and you can keep
going for pride, but there are no stars in it.

Play with a mouse or a finger, tap one tile then another, or use the keyboard:
focus a tile, move with the arrow keys, and press Enter or Space to pick up and
drop.

## Picking up where you left off

The game in progress is saved as you play, so closing the tab and coming back
later puts the board back exactly as you left it — same tiles, same swaps left,
same colours. A daily that has rolled over is not resumed (its board belonged to
yesterday, and you can still find it in the archive), and a board that had
already finished reopens without repeating its result.

## Stats, streaks and the archive

`Stats & archive` shows your record — played, wins, current streak, best streak
and a star distribution — plus the last 30 Waffles, each with its date and the
result you got. Any of them can be replayed from the archive.

Results are stored per puzzle in `localStorage`, and the streak is worked out
from those dates, so a missed day correctly breaks it. Archive games are just for
fun: they never touch your daily record or your streak.

## Sound and animation

Sound effects are synthesised with the Web Audio API, so there are no audio files
to ship: a tick on every swap, a chime when a word falls into place, a fanfare on
a win and a descending figure when the swaps run out. `Sound: on/off` mutes it,
and the choice is remembered. Audio only starts after your first tap or click, as
browsers require.

The tiles deal in when a board loads, pop when they turn green, shake when you
try to move a locked tile, and the board glows on a win. Stars pop in one at a
time. All of it is switched off for anyone who has `prefers-reduced-motion` set.

## How it is put together

```
src/
  main.jsx                  entry point
  App.jsx                   composition, modal routing, share
  hooks/useWaffleGame.js    the engine: board state and the effects of a move
  lib/
    core.js                 pure board logic — geometry, grading, solved check
    puzzles.js              generated puzzle data
    dates.js                puzzle numbering and dates
    results.js              per-puzzle results, streaks, stats
    savedGame.js            the in-progress board, validated on load
    rules.js                swap budget and star cap
    share.js                the emoji grid and clipboard handling
    sound.js                Web Audio effects
  components/               Board, Tile, Controls, Modal, Stars, …
  components/panels/        the modal screens
  styles/index.css          the whole theme
```

Two deliberate seams:

- **`lib/` has no React in it.** Board maths, dates, results and sound are plain
  modules, so they can be tested directly and reused. `core.test.js` covers the
  grading rules without rendering anything.
- **The board is positioned with the standalone `translate` property**, not
  `transform`. That leaves `scale` and `transform` free for the lift, pop and
  shake animations, and lets a swap animate by simply changing a tile's cell in
  state — the same DOM node slides to its new home.

## Puzzles

`src/lib/puzzles.js` is generated by `tools/generate_puzzles.py` and holds 2000
dailies and 500 practice boards. Each entry stores the three across words, the
three down words and a pre-scrambled 21-letter board. Crossings are guaranteed to
line up, and each board is built from a permutation that takes exactly ten swaps
to sort out, starting with at most five green tiles. The generator then checks
that a straightforward solve needs no more than thirteen of the fifteen swaps, so
the daily is always winnable without perfect play.

The generator uses a curated 5-letter word list (`tools/wordlist.txt`, the
official Wordle answer list) so the answers are recognisable words rather than
dictionary filler. It writes two files: the ES module this app imports, and a
classic script for the preserved no-build version in `vanilla/`.

The daily board is chosen by date from the pool of 2000, so a puzzle recurs
roughly every five and a half years with a new number. Every past day in the
archive points back at the same puzzle it always did.

## Tests

`npm test` runs 66 tests across seven files:

- `lib/core.test.js` — board geometry, Wordle grading including repeated letters,
  and the rule that a crossing tile is graded against its across word first and
  falls back to its down word.
- `lib/puzzles.test.js` — every one of the 2500 puzzles: crossings line up, the
  board is a true anagram of the solution, it is never already solved, and it is
  always fair to solve inside the swap budget.
- `lib/results.test.js` — streaks, gaps, losses, upgrades and corrupt storage.
- `lib/savedGame.test.js` — what is resumed and what is refused: a daily from an
  earlier day, a board that is not a rearrangement of its puzzle, unknown modes
  and statuses, and storage that is missing or blocked.
- `lib/dates.test.js`, `lib/share.test.js` — numbering and the share output.
- `App.test.jsx` — renders the app in jsdom and plays it: tap and drag swaps,
  locked green tiles, the keyboard path, solving for stars, running out of swaps,
  revealing the answer, retrying, sharing, the stats/archive and help screens,
  and leaving mid-game and coming back.

## Theme

The palette is taken from the Wordle Social stylesheet: deep green-black
surfaces (`hsl(150 30% 4%)`), the Tailwind green scale (`#4ade80` → `#15803d`)
for correct tiles, and amber (`#fcd34d` → `#d97706`) for misplaced ones. The
design tokens live at the top of `src/styles/index.css` under the same names the
Wordle Social app uses (`--background`, `--primary`, `--border`, `--ring`, …).

## `vanilla/`

The original no-build version of this game is kept in `vanilla/` — same rules,
same theme, plain scripts, no toolchain. Open `vanilla/index.html` in a browser
to play it. It is a snapshot kept for reference and is not part of the build; it
has its own copy of the generated puzzle data.

## Notes

This is an independent clone for learning purposes. Waffle itself is made by
[Waffle Studio Ltd](https://wafflegame.net/); the rules and colour behaviour here
are modelled on the published how-to-play.

© MMXXVI Michael O'Sullivan
