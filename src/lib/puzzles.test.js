import { describe, expect, it } from 'vitest'

import { CELLS, cellIndex, solutionLetters } from './core.js'
import { WAFFLE_DAILY, WAFFLE_PRACTICE } from './puzzles.js'

// How many swaps a straightforward player needs, mirroring the generator.
function greedySwaps(board, solution) {
  const current = board.slice()
  for (let swaps = 0; swaps <= current.length; swaps += 1) {
    const wrong = current.findIndex((letter, index) => letter !== solution[index])
    if (wrong < 0) return swaps
    const letter = current[wrong]
    const target = solution.findIndex((place, index) => place === letter && current[index] !== letter)
    if (target < 0) return Infinity
    ;[current[wrong], current[target]] = [current[target], current[wrong]]
  }
  return Infinity
}

const all = [...WAFFLE_DAILY, ...WAFFLE_PRACTICE]

describe('generated puzzles', () => {
  it('provides plenty of dailies and practice boards', () => {
    expect(WAFFLE_DAILY.length).toBeGreaterThanOrEqual(1000)
    expect(WAFFLE_PRACTICE.length).toBeGreaterThanOrEqual(200)
  })

  it('every puzzle is well formed', () => {
    all.forEach((puzzle, index) => {
      const where = `puzzle ${index}`
      expect(puzzle.across, where).toHaveLength(3)
      expect(puzzle.down, where).toHaveLength(3)

      const words = [...puzzle.across, ...puzzle.down]
      words.forEach((word) => expect(word, where).toMatch(/^[a-z]{5}$/))
      expect(new Set(words).size, where).toBe(6)

      // The crossings must line up, or the "words" would not meet.
      for (const column of [0, 2, 4]) {
        for (const row of [0, 2, 4]) {
          expect(puzzle.across[row / 2][column], `${where} crossing at ${column},${row}`).toBe(
            puzzle.down[column / 2][row],
          )
        }
      }
    })
  })

  it('every puzzle is a fair scramble', () => {
    all.forEach((puzzle, index) => {
      const where = `puzzle ${index}`
      const solution = solutionLetters(puzzle.across, puzzle.down)
      const board = puzzle.board.split('')

      expect(board, where).toHaveLength(CELLS.length)
      expect([...board].sort(), where).toEqual([...solution].sort())
      expect(board.join(''), where).not.toBe(solution.join(''))

      // Never already solved, never a walkover, always winnable in budget.
      const greens = board.filter((letter, position) => letter === solution[position]).length
      expect(greens, where).toBeLessThanOrEqual(5)

      const greedy = greedySwaps(board, solution)
      expect(greedy, where).toBeGreaterThanOrEqual(9)
      expect(greedy, where).toBeLessThanOrEqual(15)
    })
  })

  it('leaves the four gaps out of the board', () => {
    expect(WAFFLE_DAILY[0].board).toHaveLength(21)
    expect(cellIndex(1, 1)).toBe(-1)
    expect(cellIndex(3, 3)).toBe(-1)
  })
})
