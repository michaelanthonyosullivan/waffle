import { beforeEach, describe, expect, it } from 'vitest'

import { WAFFLE_DAILY, WAFFLE_PRACTICE } from './puzzles.js'
import { clearSavedGame, loadSavedGame, saveGame } from './savedGame.js'
import { dailyIndexFor, formatDate, dateFor, todayNumber } from './dates.js'

const KEY = 'waffle-clone:game'

function payload(overrides = {}) {
  const puzzle = WAFFLE_DAILY[0]
  return {
    version: 1,
    mode: 'practice',
    number: 0,
    label: 'Practice Waffle',
    puzzle,
    letters: puzzle.board,
    swapsRemaining: 12,
    status: 'playing',
    revealed: false,
    ...overrides,
  }
}

function store(overrides) {
  localStorage.setItem(KEY, JSON.stringify(payload(overrides)))
}

beforeEach(() => {
  localStorage.clear()
})

describe('saved game', () => {
  it('round-trips a game', () => {
    const game = payload()
    saveGame(game)
    const loaded = loadSavedGame()
    expect(loaded).toMatchObject({
      mode: game.mode,
      letters: game.letters,
      swapsRemaining: 12,
      status: 'playing',
      revealed: false,
    })
    expect(loaded.puzzle.board).toBe(game.puzzle.board)
  })

  it('has nothing to load before the first save', () => {
    expect(loadSavedGame()).toBeNull()
  })

  it('forgets a game on request', () => {
    saveGame(payload())
    clearSavedGame()
    expect(loadSavedGame()).toBeNull()
  })

  it('resumes today’s daily', () => {
    const today = todayNumber()
    store({ mode: 'daily', number: today, label: `Daily Waffle #${today}` })
    expect(loadSavedGame()).toMatchObject({ mode: 'daily', number: today })
  })

  it('does not resume a daily from an earlier day', () => {
    const today = todayNumber()
    store({ mode: 'daily', number: today - 1, label: `Daily Waffle #${today - 1}` })
    expect(loadSavedGame()).toBeNull()
  })

  it('resumes an archive game from another day', () => {
    store({ mode: 'archive', number: todayNumber() - 40, label: 'Archive Waffle #1' })
    expect(loadSavedGame()).toMatchObject({ mode: 'archive' })
  })

  it('ignores anything it cannot trust', () => {
    const soup = ['', 'not json', '{}', 'null', '[]', '"a string"', '{"version":99}']
    soup.forEach((raw) => {
      localStorage.setItem(KEY, raw)
      expect(loadSavedGame(), raw).toBeNull()
    })
  })

  it('rejects a board whose tiles no longer match the puzzle', () => {
    // Twenty-one letters, but not a rearrangement of this puzzle.
    store({ letters: 'aaaaaaaaaaaaaaaaaaaaa' })
    expect(loadSavedGame()).toBeNull()
  })

  it('rejects a board of the wrong length', () => {
    store({ letters: 'abcdefghijklmnopqrst' })
    expect(loadSavedGame()).toBeNull()
  })

  it('rejects unknown modes, statuses and swap counts', () => {
    expect(loadSavedGame()).toBeNull()
    store({ mode: 'royale' })
    expect(loadSavedGame()).toBeNull()
    store({ status: 'paused' })
    expect(loadSavedGame()).toBeNull()
    store({ swapsRemaining: 99 })
    expect(loadSavedGame()).toBeNull()
    store({ swapsRemaining: 12.5 })
    expect(loadSavedGame()).toBeNull()
  })

  it('rejects a malformed puzzle', () => {
    store({ puzzle: { across: ['a'], down: ['b'], board: 'short' } })
    expect(loadSavedGame()).toBeNull()
    store({ puzzle: undefined })
    expect(loadSavedGame()).toBeNull()
  })

  it('keeps a practice board mid-game with moves made', () => {
    const puzzle = WAFFLE_PRACTICE[0]
    const letters = puzzle.board.split('')
    ;[letters[0], letters[1]] = [letters[1], letters[0]]
    store({ puzzle, letters: letters.join(''), swapsRemaining: 14 })
    expect(loadSavedGame()).toMatchObject({ letters: letters.join(''), swapsRemaining: 14 })
  })

  it('survives storage being unavailable', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('blocked')
      },
    })
    expect(loadSavedGame()).toBeNull()
    expect(() => saveGame(payload())).not.toThrow()
    expect(() => clearSavedGame()).not.toThrow()
    Object.defineProperty(globalThis, 'localStorage', original)
  })

  it('keeps a consistent picture of the pool it came from', () => {
    // Guards the test helper itself: the daily pool must be addressable.
    const today = todayNumber()
    const puzzle = WAFFLE_DAILY[dailyIndexFor(today, WAFFLE_DAILY.length)]
    expect(puzzle.board).toMatch(/^[a-z]{21}$/)
    expect(formatDate(dateFor(today))).toMatch(/20\d\d/)
  })
})
