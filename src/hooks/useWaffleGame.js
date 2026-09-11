/* Waffle — the game engine as a React hook.
 *
 * Board maths lives in lib/core.js, sound in lib/sound.js and results in
 * lib/results.js; this hook owns the board state and the side effects that
 * follow a move.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { CELL_COUNT, gradeBoard, isSolved, solutionLetters } from '../lib/core.js'
import { dailyIndexFor, dateFor, formatDate, todayNumber } from '../lib/dates.js'
import { WAFFLE_DAILY, WAFFLE_PRACTICE } from '../lib/puzzles.js'
import { recordResult } from '../lib/results.js'
import { SWAP_BUDGET, STAR_CAP } from '../lib/rules.js'
import { loadSavedGame, saveGame } from '../lib/savedGame.js'
import * as Sound from '../lib/sound.js'

const FLASH_MS = 470
const MOVING_MS = 300
const SHAKE_MS = 340
const DEAL_MS = CELL_COUNT * 18 + 520

function reducedMotion() {
  return (
    typeof globalThis.matchMedia === 'function' &&
    globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function createGame(puzzle, { mode, number, label, attempt }) {
  const across = puzzle.across.slice()
  const down = puzzle.down.slice()
  return {
    puzzle,
    attempt,
    mode,
    number,
    label,
    across,
    down,
    solution: solutionLetters(across, down),
    tiles: puzzle.board.split('').map((letter, id) => ({ id, letter, cell: id })),
    swapsRemaining: SWAP_BUDGET,
    status: 'playing', // 'playing' | 'won' | 'lost'
    revealed: false,
    selectedId: null,
  }
}

function dailyGame(attempt) {
  const n = todayNumber()
  return createGame(WAFFLE_DAILY[dailyIndexFor(n, WAFFLE_DAILY.length)], {
    mode: 'daily',
    number: n,
    label: `Daily Waffle #${n} · ${formatDate(dateFor(n))}`,
    attempt,
  })
}

/** Rebuild a game from the stored snapshot. */
function restoreGame(saved) {
  const across = saved.puzzle.across.slice()
  const down = saved.puzzle.down.slice()
  return {
    puzzle: saved.puzzle,
    attempt: 0,
    mode: saved.mode,
    number: saved.number,
    label: saved.label,
    across,
    down,
    solution: solutionLetters(across, down),
    // Each tile keeps a stable id for React keys; only the letters matter.
    tiles: saved.letters.split('').map((letter, id) => ({ id, letter, cell: id })),
    swapsRemaining: saved.swapsRemaining,
    status: saved.status,
    revealed: saved.revealed,
    selectedId: null,
  }
}

function initialGame() {
  const saved = loadSavedGame()
  return saved ? restoreGame(saved) : dailyGame(0)
}

export function useWaffleGame() {
  const [game, setGame] = useState(initialGame)
  const gameRef = useRef(game)
  const attemptRef = useRef(0)
  const timers = useRef([])

  const [flashIds, setFlashIds] = useState([])
  const [movingIds, setMovingIds] = useState([])
  const [shakeIds, setShakeIds] = useState([])
  const [dealing, setDealing] = useState(() => !reducedMotion())

  // Handlers read the ref so two moves in the same tick cannot clobber one
  // another with a stale snapshot.
  const commit = useCallback((next) => {
    gameRef.current = next
    setGame(next)
  }, [])

  const pulse = useCallback((setter, id, ms) => {
    setter((prev) => (prev.includes(id) ? prev : [...prev, id]))
    const timer = setTimeout(() => setter((prev) => prev.filter((value) => value !== id)), ms)
    timers.current.push(timer)
  }, [])

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout)
      timers.current = []
    },
    [],
  )

  // The deal-in animation is started by start() and cleared once it is over.
  useEffect(() => {
    if (!dealing) return undefined
    const timer = setTimeout(() => setDealing(false), DEAL_MS)
    return () => clearTimeout(timer)
  }, [dealing, game.attempt])

  const grid = useMemo(() => {
    const cells = new Array(CELL_COUNT)
    game.tiles.forEach((tile) => {
      cells[tile.cell] = tile
    })
    return cells
  }, [game.tiles])

  const letters = useMemo(() => grid.map((tile) => tile.letter), [grid])
  const marks = useMemo(
    () => gradeBoard(letters, game.across, game.down),
    [letters, game.across, game.down],
  )
  const lockedIds = useMemo(
    () => new Set(game.tiles.filter((tile) => marks[tile.cell] === 'green').map((tile) => tile.id)),
    [game.tiles, marks],
  )

  const earnedStars =
    game.status === 'won' ? Math.max(0, Math.min(STAR_CAP, game.swapsRemaining)) : 0
  const locked = game.status === 'won' || game.revealed

  // Remember the board so a returning player picks up where they left off.
  useEffect(() => {
    saveGame({
      mode: game.mode,
      number: game.number,
      label: game.label,
      puzzle: game.puzzle,
      letters: [...game.tiles]
        .sort((a, b) => a.cell - b.cell)
        .map((tile) => tile.letter)
        .join(''),
      swapsRemaining: game.swapsRemaining,
      status: game.status,
      revealed: game.revealed,
    })
  }, [game])

  const start = useCallback(
    (puzzle, options) => {
      attemptRef.current += 1
      commit(createGame(puzzle, { ...options, attempt: attemptRef.current }))
      setFlashIds([])
      setMovingIds([])
      setShakeIds([])
      setDealing(!reducedMotion())
    },
    [commit],
  )

  const startDaily = useCallback(() => {
    start(WAFFLE_DAILY[dailyIndexFor(todayNumber(), WAFFLE_DAILY.length)], {
      mode: 'daily',
      number: todayNumber(),
      label: `Daily Waffle #${todayNumber()} · ${formatDate(dateFor(todayNumber()))}`,
    })
  }, [start])

  const startArchive = useCallback(
    (n) => {
      start(WAFFLE_DAILY[dailyIndexFor(n, WAFFLE_DAILY.length)], {
        mode: 'archive',
        number: n,
        label: `Archive Waffle #${n} · ${formatDate(dateFor(n))}`,
      })
    },
    [start],
  )

  const startPractice = useCallback(() => {
    const index = Math.floor(Math.random() * WAFFLE_PRACTICE.length)
    start(WAFFLE_PRACTICE[index], { mode: 'practice', number: 0, label: 'Practice Waffle' })
  }, [start])

  const retry = useCallback(() => {
    const current = gameRef.current
    start(current.puzzle, { mode: current.mode, number: current.number, label: current.label })
  }, [start])

  const shake = useCallback(
    (id) => {
      if (reducedMotion()) return
      pulse(setShakeIds, id, SHAKE_MS)
    },
    [pulse],
  )

  /** Swap two tiles by id. Returns false when the move is not allowed. */
  const swap = useCallback(
    (aId, bId) => {
      const current = gameRef.current
      if (current.status === 'won' || current.revealed) return false

      const a = current.tiles.find((tile) => tile.id === aId)
      const b = current.tiles.find((tile) => tile.id === bId)
      if (!a || !b || a.id === b.id) return false
      if (lockedIds.has(a.id) || lockedIds.has(b.id)) return false
      if (a.letter === b.letter) {
        Sound.invalid()
        commit({ ...current, selectedId: null })
        return false
      }

      const nextTiles = current.tiles.map((tile) =>
        tile.id === aId ? { ...tile, cell: b.cell } : tile.id === bId ? { ...tile, cell: a.cell } : tile,
      )
      const nextGrid = new Array(CELL_COUNT)
      nextTiles.forEach((tile) => {
        nextGrid[tile.cell] = tile
      })
      const nextLetters = nextGrid.map((tile) => tile.letter)
      const nextMarks = gradeBoard(nextLetters, current.across, current.down)
      const turnedGreen = nextTiles
        .filter((tile) => marks[tile.cell] !== 'green' && nextMarks[tile.cell] === 'green')
        .map((tile) => tile.id)

      const swapsRemaining = current.swapsRemaining - 1
      const won = isSolved(nextLetters, current.solution)
      const status = won ? 'won' : swapsRemaining <= 0 ? 'lost' : current.status

      // Record the outcome in the same commit that opens the summary modal, so
      // the panel reads the stored result rather than the previous one.
      if (status !== 'playing' && status !== current.status) {
        recordResult({
          mode: current.mode,
          number: current.number,
          won: status === 'won',
          stars: won ? Math.max(0, Math.min(STAR_CAP, swapsRemaining)) : 0,
        })
      }

      commit({ ...current, tiles: nextTiles, swapsRemaining, selectedId: null, status })
      Sound.swap()
      if (!reducedMotion()) {
        turnedGreen.forEach((id) => pulse(setFlashIds, id, FLASH_MS))
        ;[aId, bId].forEach((id) => pulse(setMovingIds, id, MOVING_MS))
      }

      if (status === 'won') Sound.win()
      else if (status === 'lost') Sound.lose()
      else if (turnedGreen.length) Sound.complete()
      return true
    },
    [commit, lockedIds, marks, pulse],
  )

  const tap = useCallback(
    (id) => {
      const current = gameRef.current
      if (current.status === 'won' || current.revealed) {
        if (current.selectedId !== null) commit({ ...current, selectedId: null })
        return
      }
      const tile = current.tiles.find((entry) => entry.id === id)
      if (!tile) return
      if (lockedIds.has(id)) {
        shake(id)
        Sound.invalid()
        return
      }
      if (current.selectedId === null) {
        commit({ ...current, selectedId: id })
        return
      }
      if (current.selectedId === id) {
        commit({ ...current, selectedId: null })
        return
      }
      swap(current.selectedId, id)
    },
    [commit, lockedIds, shake, swap],
  )

  const clearSelection = useCallback(() => {
    const current = gameRef.current
    if (current.selectedId !== null) commit({ ...current, selectedId: null })
  }, [commit])

  const reveal = useCallback(() => {
    const current = gameRef.current
    const pool = current.tiles.slice()
    const used = new Set()
    const nextTiles = current.solution.map((letter, cell) => {
      const index = pool.findIndex((tile, i) => !used.has(i) && tile.letter === letter)
      if (index < 0) return null
      used.add(index)
      return { ...pool[index], cell }
    })
    commit({ ...current, tiles: nextTiles, revealed: true, selectedId: null })
  }, [commit])

  return {
    attempt: game.attempt,
    mode: game.mode,
    number: game.number,
    label: game.label,
    tiles: game.tiles,
    grid,
    letters,
    marks,
    lockedIds,
    selectedId: game.selectedId,
    swapsRemaining: game.swapsRemaining,
    status: game.status,
    revealed: game.revealed,
    earnedStars,
    locked,
    across: game.across,
    down: game.down,
    flashIds,
    movingIds,
    shakeIds,
    dealing,
    startDaily,
    startArchive,
    startPractice,
    retry,
    swap,
    tap,
    clearSelection,
    reveal,
    unlockSound: Sound.unlock,
  }
}
