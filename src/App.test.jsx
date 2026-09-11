import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import App from './App.jsx'
import { CELLS, solutionLetters } from './lib/core.js'
import { todayNumber } from './lib/dates.js'
import { WAFFLE_DAILY, WAFFLE_PRACTICE } from './lib/puzzles.js'

function cellsInOrder() {
  const out = new Array(CELLS.length)
  screen.getAllByRole('gridcell').forEach((el) => {
    out[Number(el.dataset.cell)] = el.textContent
  })
  return out
}

function tileAt(cell) {
  return screen.getAllByRole('gridcell').find((el) => Number(el.dataset.cell) === cell)
}

function swapsLeft() {
  return Number(document.querySelector('#hud strong').textContent)
}

/** A tap is a pointer press and release without movement. */
function tap(element) {
  fireEvent.pointerDown(element, { button: 0, pointerId: 1, clientX: 0, clientY: 0 })
  fireEvent.pointerUp(window, { pointerId: 1 })
}

function swapCells(a, b) {
  tap(tileAt(a))
  tap(tileAt(b))
}

/** The puzzle the app opened with, found by matching the rendered board. */
function currentPuzzle() {
  const board = cellsInOrder().join('')
  return WAFFLE_DAILY.find((p) => p.board === board) ?? WAFFLE_PRACTICE.find((p) => p.board === board)
}

function currentSolution() {
  const puzzle = currentPuzzle()
  return solutionLetters(puzzle.across, puzzle.down)
}

function solveBoard(solution) {
  for (let guard = 0; guard < 40; guard += 1) {
    const letters = cellsInOrder()
    if (letters.join('') === solution.join('')) return
    const from = letters.findIndex((letter, index) => letter !== solution[index])
    const to = solution.findIndex((letter, index) => letter === letters[from] && letters[index] !== letter)
    if (to < 0) return
    swapCells(from, to)
  }
}

/** Two wrongly placed tiles that both stay wrong, so the board never solves. */
function neutralPair(solution) {
  const letters = cellsInOrder()
  const wrong = letters.map((_, index) => index).filter((index) => letters[index] !== solution[index])
  for (const i of wrong) {
    for (const j of wrong) {
      if (i === j || letters[i] === letters[j]) continue
      if (letters[j] === solution[i] || letters[i] === solution[j]) continue
      return [i, j]
    }
  }
  return null
}

function centreOf(cell) {
  const board = document.getElementById('board')
  const size = parseFloat(board.style.getPropertyValue('--tile'))
  const gap = parseFloat(board.style.getPropertyValue('--gap'))
  const step = size + gap
  const { x, y } = CELLS[cell]
  return { clientX: x * step + size / 2, clientY: y * step + size / 2 }
}

function dialog() {
  return screen.getByRole('dialog')
}

beforeEach(() => {
  localStorage.clear()
  document.execCommand = () => true
})

describe('the board', () => {
  it('renders 21 tiles with the title, byline, copyright and status', () => {
    render(<App />)

    expect(screen.getAllByRole('gridcell')).toHaveLength(21)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Waffle')
    expect(screen.getByText("by Michael O'Sullivan")).toBeInTheDocument()
    expect(screen.getByText("© MMXXVI Michael O'Sullivan")).toBeInTheDocument()
    expect(screen.getByText(/Daily Waffle #\d+/)).toBeInTheDocument()
    expect(swapsLeft()).toBe(15)
  })

  it('starts with some tiles coloured', () => {
    render(<App />)
    const tiles = screen.getAllByRole('gridcell')
    const green = tiles.filter((el) => el.classList.contains('is-green'))
    const yellow = tiles.filter((el) => el.classList.contains('is-yellow'))
    expect(green.length).toBeGreaterThan(0)
    expect(green.length).toBeLessThanOrEqual(5)
    expect(yellow.length).toBeGreaterThan(0)
  })

  it('swaps two tiles by tapping them', () => {
    render(<App />)
    const before = cellsInOrder()
    const from = before.findIndex((letter, index) => before.some((other, j) => j !== index && other !== letter))
    const to = before.findIndex((letter, index) => index !== from && letter !== before[from])

    swapCells(from, to)

    const after = cellsInOrder()
    expect(after[to]).toBe(before[from])
    expect(after[from]).toBe(before[to])
    expect(swapsLeft()).toBe(14)
  })

  it('swaps a tile dragged onto another', () => {
    render(<App />)
    const before = cellsInOrder()
    const from = before.findIndex((letter, index) => before.some((other, j) => j !== index && other !== letter))
    const to = before.findIndex((letter, index) => index !== from && letter !== before[from])

    const { clientX, clientY } = centreOf(to)
    fireEvent.pointerDown(tileAt(from), { button: 0, pointerId: 7, clientX: 0, clientY: 0 })
    fireEvent.pointerMove(window, { pointerId: 7, clientX: clientX / 2, clientY: clientY / 2 })
    fireEvent.pointerMove(window, { pointerId: 7, clientX, clientY })
    fireEvent.pointerUp(window, { pointerId: 7 })

    const after = cellsInOrder()
    expect(after[to]).toBe(before[from])
    expect(after[from]).toBe(before[to])
    expect(swapsLeft()).toBe(14)
  })

  it('will not move a green tile', () => {
    render(<App />)
    const before = cellsInOrder().join('')
    const green = screen.getAllByRole('gridcell').find((el) => el.classList.contains('is-green'))

    tap(green)

    expect(cellsInOrder().join('')).toBe(before)
    expect(swapsLeft()).toBe(15)
  })

  it('moves focus with the arrow keys and plays with the keyboard', () => {
    render(<App />)
    const tiles = screen.getAllByRole('gridcell')
    const start = tiles.find((el) => !el.classList.contains('is-green'))
    start.focus()
    expect(document.activeElement).toBe(start)

    fireEvent.keyDown(start, { key: 'ArrowRight' })
    expect(document.activeElement).not.toBe(start)

    const before = cellsInOrder().join('')
    const focused = document.activeElement
    fireEvent.keyDown(focused, { key: 'Enter' })
    expect(focused.classList.contains('is-selected')).toBe(true)
    fireEvent.keyDown(focused, { key: 'Escape' })
    expect(focused.classList.contains('is-selected')).toBe(false)
    expect(cellsInOrder().join('')).toBe(before)
  })
})

describe('finishing a board', () => {
  it('celebrates a solved board with stars and enables sharing', () => {
    render(<App />)
    const solution = currentSolution()
    solveBoard(solution)

    expect(screen.getByText('Success!')).toBeInTheDocument()
    const earned = within(dialog()).getAllByText('★').filter((el) => el.classList.contains('is-earned'))
    expect(earned.length).toBe(Math.max(0, Math.min(5, swapsLeft())))
    expect(screen.getAllByRole('button', { name: 'Share' })[0]).toBeEnabled()
    expect(screen.getAllByRole('gridcell').every((el) => el.classList.contains('is-green'))).toBe(true)
  })

  it('records the daily result and shows it in the summary', () => {
    render(<App />)
    solveBoard(currentSolution())

    const values = within(dialog())
      .getAllByRole('term')
      .map((dt) => dt.nextElementSibling.textContent)
    expect(values).toEqual(['1', '1', '1', '1'])
    expect(JSON.parse(localStorage.getItem('waffle-clone:results'))).toHaveProperty(String(todayNumber()))
  })

  it('runs out of swaps and can reveal the answer', () => {
    render(<App />)
    const solution = currentSolution()

    for (let guard = 0; guard < 30 && !screen.queryByText('Game over'); guard += 1) {
      const pair = neutralPair(solution)
      if (!pair) break
      swapCells(pair[0], pair[1])
    }

    expect(screen.getByText('Game over')).toBeInTheDocument()
    expect(swapsLeft()).toBe(0)

    fireEvent.click(within(dialog()).getByRole('button', { name: 'Show solution' }))

    expect(screen.getByText('Solution')).toBeInTheDocument()
    expect(within(dialog()).getByText('Across')).toBeInTheDocument()
    expect(screen.getAllByRole('gridcell').every((el) => el.classList.contains('is-green'))).toBe(true)
  })

  it('keeps playing after a loss and still celebrates a solve', () => {
    render(<App />)
    const solution = currentSolution()

    for (let guard = 0; guard < 30 && !screen.queryByText('Game over'); guard += 1) {
      const pair = neutralPair(solution)
      if (!pair) break
      swapCells(pair[0], pair[1])
    }
    expect(screen.getByText('Game over')).toBeInTheDocument()

    fireEvent.click(within(dialog()).getByRole('button', { name: 'Keep trying' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    solveBoard(solution)
    expect(screen.getByText('Success!')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('waffle-clone:results'))[String(todayNumber())]).toBe(0)
  })
})

describe('sharing', () => {
  it('copies an emoji grid for a finished daily', async () => {
    let copied = ''
    document.execCommand = () => {
      copied = document.querySelector('textarea')?.value ?? ''
      return true
    }

    render(<App />)
    solveBoard(currentSolution())
    fireEvent.click(screen.getAllByRole('button', { name: 'Share' })[0])

    await screen.findByText('Copied result to the clipboard')

    const lines = copied.split('\n')
    expect(lines[0]).toMatch(new RegExp(`^Waffle #${todayNumber()} \\d/5$`))
    expect(lines[1]).toBe('🟩🟩🟩🟩🟩')
    expect(lines[2]).toBe('🟩⬜🟩⬜🟩')
    expect(lines[5]).toBe('🟩🟩🟩🟩🟩')
  })
})

describe('the modals and controls', () => {
  it('opens and closes the how-to-play screen', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'How to play' }))

    expect(within(dialog()).getByText('How to play')).toBeInTheDocument()
    expect(within(dialog()).getByText(/15 swaps/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows stats and plays a Waffle from the archive', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Stats & archive' }))

    expect(within(dialog()).getByText('Your record')).toBeInTheDocument()
    expect(within(dialog()).getByText('Star distribution')).toBeInTheDocument()

    const items = within(dialog())
      .getAllByRole('button')
      .filter((el) => /Waffle #\d+/.test(el.textContent))
    expect(items).toHaveLength(30)

    fireEvent.click(items[0])

    expect(screen.getByText(/Archive Waffle #\d+/)).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(swapsLeft()).toBe(15)
  })

  it('starts a practice board', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Practice' }))

    expect(screen.getByText('Practice Waffle')).toBeInTheDocument()
    expect(swapsLeft()).toBe(15)
    expect(WAFFLE_PRACTICE.some((p) => p.board === cellsInOrder().join(''))).toBe(true)
  })

  it('remembers the sound setting', () => {
    render(<App />)
    const button = screen.getByRole('button', { name: 'Sound: on' })

    fireEvent.click(button)

    expect(screen.getByRole('button', { name: 'Sound: off' })).toHaveAttribute('aria-pressed', 'false')
    expect(localStorage.getItem('waffle-clone:sound')).toBe('off')

    fireEvent.click(screen.getByRole('button', { name: 'Sound: off' }))
    expect(screen.getByRole('button', { name: 'Sound: on' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('retries the same board after running out of swaps', () => {
    render(<App />)
    const before = cellsInOrder().join('')
    const solution = currentSolution()

    for (let guard = 0; guard < 30 && !screen.queryByText('Game over'); guard += 1) {
      const pair = neutralPair(solution)
      if (!pair) break
      swapCells(pair[0], pair[1])
    }

    fireEvent.click(within(dialog()).getByRole('button', { name: 'Retry' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(cellsInOrder().join('')).toBe(before)
    expect(swapsLeft()).toBe(15)
  })
})

describe('coming back later', () => {
  function seedGame(overrides = {}) {
    const puzzle = WAFFLE_DAILY[0]
    localStorage.setItem(
      'waffle-clone:game',
      JSON.stringify({
        version: 1,
        mode: 'daily',
        number: todayNumber(),
        label: `Daily Waffle #${todayNumber()}`,
        puzzle,
        letters: puzzle.board,
        swapsRemaining: 12,
        status: 'playing',
        revealed: false,
        ...overrides,
      }),
    )
  }

  it('picks up exactly where the player left off', () => {
    const first = render(<App />)
    const before = cellsInOrder()
    const from = before.findIndex((letter, index) => before.some((other, j) => j !== index && other !== letter))
    const to = before.findIndex((letter, index) => index !== from && letter !== before[from])
    swapCells(from, to)
    const afterMove = cellsInOrder().join('')
    expect(swapsLeft()).toBe(14)

    first.unmount() // the player closes the tab

    render(<App />) // and comes back later
    expect(cellsInOrder().join('')).toBe(afterMove)
    expect(swapsLeft()).toBe(14)
    expect(screen.getByText(/Daily Waffle #\d+/)).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('starts a fresh daily when the saved one is from an earlier day', () => {
    seedGame({ number: todayNumber() - 1, label: 'Daily Waffle #yesterday' })

    render(<App />)

    expect(swapsLeft()).toBe(15)
    expect(screen.getByText(new RegExp(`Daily Waffle #${todayNumber()}`))).toBeInTheDocument()
    expect(currentPuzzle()).toBeTruthy()
  })

  it('does not reopen the result of a game that had already finished', () => {
    const puzzle = WAFFLE_DAILY[0]
    seedGame({
      letters: solutionLetters(puzzle.across, puzzle.down).join(''),
      swapsRemaining: 3,
      status: 'won',
    })

    render(<App />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(swapsLeft()).toBe(3)
    expect(screen.getAllByRole('gridcell').every((el) => el.classList.contains('is-green'))).toBe(true)
    expect(screen.getAllByRole('button', { name: 'Share' })[0]).toBeEnabled()
  })

  it('ignores a saved game it cannot trust and deals the daily instead', () => {
    localStorage.setItem('waffle-clone:game', '{ not json')

    render(<App />)

    expect(screen.getAllByRole('gridcell')).toHaveLength(21)
    expect(swapsLeft()).toBe(15)
  })
})
