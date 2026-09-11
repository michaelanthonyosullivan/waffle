/* Waffle — remembering the board between visits.
 *
 * The whole game is small enough to store as JSON: which puzzle is on screen,
 * where every tile currently sits, and how the game is going.  Anything that
 * fails validation is treated as "no saved game" rather than being partly
 * trusted, so a corrupt or hand-edited entry can never wedge the app.
 */

import { todayNumber } from './dates.js'
import { SWAP_BUDGET } from './rules.js'

const KEY = 'waffle-clone:game'
const VERSION = 1

const MODES = ['daily', 'archive', 'practice']
const STATUSES = ['playing', 'won', 'lost']
const BOARD = /^[a-z]{21}$/

function isRearrangement(a, b) {
  return a.split('').sort().join('') === b.split('').sort().join('')
}

/**
 * The saved game, or null when there is nothing usable to resume.
 *
 * A daily from an earlier day is deliberately not resumed: the daily rolls
 * over, and the board belonged to yesterday.
 */
export function loadSavedGame() {
  try {
    const raw = globalThis.localStorage?.getItem(KEY)
    if (!raw) return null

    const saved = JSON.parse(raw)
    if (!saved || saved.version !== VERSION) return null

    const { puzzle } = saved
    if (!puzzle || !Array.isArray(puzzle.across) || !Array.isArray(puzzle.down)) return null
    if (puzzle.across.length !== 3 || puzzle.down.length !== 3) return null
    if (typeof puzzle.board !== 'string' || !BOARD.test(puzzle.board)) return null

    if (typeof saved.letters !== 'string' || !BOARD.test(saved.letters)) return null
    // The tiles must still be a rearrangement of this puzzle's own letters.
    if (!isRearrangement(saved.letters, puzzle.board)) return null

    if (!MODES.includes(saved.mode)) return null
    if (typeof saved.number !== 'number' || typeof saved.label !== 'string') return null
    if (!STATUSES.includes(saved.status)) return null
    if (typeof saved.revealed !== 'boolean') return null
    if (!Number.isInteger(saved.swapsRemaining)) return null
    if (saved.swapsRemaining > SWAP_BUDGET || saved.swapsRemaining < -SWAP_BUDGET) return null

    if (saved.mode === 'daily' && saved.number !== todayNumber()) return null

    return saved
  } catch {
    return null
  }
}

export function saveGame(game) {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify({ version: VERSION, ...game }))
  } catch {
    /* private mode: the game just will not be remembered */
  }
}

export function clearSavedGame() {
  try {
    globalThis.localStorage?.removeItem(KEY)
  } catch {
    /* nothing to clear */
  }
}
