import { describe, expect, it } from 'vitest'

import { CELLS, CELL_COUNT, cellIndex, gradeBoard, gradeWord, isSolved, solutionLetters } from './core.js'

describe('board geometry', () => {
  it('has 21 playable cells in reading order', () => {
    expect(CELL_COUNT).toBe(21)
    expect(CELLS.slice(0, 6)).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
      { x: 4, y: 0 },
      { x: 0, y: 1 },
    ])
  })

  it('leaves the four inner corners empty', () => {
    expect(cellIndex(1, 1)).toBe(-1)
    expect(cellIndex(3, 1)).toBe(-1)
    expect(cellIndex(1, 3)).toBe(-1)
    expect(cellIndex(3, 3)).toBe(-1)
    expect(cellIndex(0, 1)).toBeGreaterThanOrEqual(0)
  })
})

describe('gradeWord', () => {
  it('marks an identical word all green', () => {
    expect(gradeWord('apple', 'apple')).toEqual(['green', 'green', 'green', 'green', 'green'])
  })

  it('only marks a repeated guess letter as often as the solution contains it', () => {
    expect(gradeWord('abbey', 'bobby')).toEqual(['yellow', '', 'green', '', 'green'])
  })

  it('takes greens before placing yellows', () => {
    expect(gradeWord('llama', 'alarm')).toEqual(['yellow', 'green', 'green', '', 'yellow'])
  })

  it('matches identical letters greedily', () => {
    expect(gradeWord('aback', 'cabal')).toEqual(['yellow', 'yellow', 'yellow', 'yellow', ''])
  })

  it('never marks a letter the word does not contain', () => {
    expect(gradeWord('sassy', 'civic')).toEqual(['', '', '', '', ''])
  })
})

// A small, verified word square:
//
//     f r a m e
//     e   n   x
//     l a t h e
//     l   i   r
//     a s c o t
//
const across = ['frame', 'lathe', 'ascot']
const down = ['fella', 'antic', 'exert']
const solution = solutionLetters(across, down)

function withSwap(a, b) {
  const board = solution.slice()
  board[a] = solution[b]
  board[b] = solution[a]
  return board
}

describe('gradeBoard', () => {
  it('lines the crossings up', () => {
    expect(solution).toHaveLength(21)
    for (const column of [0, 2, 4]) {
      for (const row of [0, 2, 4]) {
        expect(across[row / 2][column]).toBe(down[column / 2][row])
      }
    }
  })

  it('marks a solved board all green', () => {
    expect(gradeBoard(solution, across, down)).toEqual(solution.map(() => 'green'))
    expect(isSolved(solution, solution)).toBe(true)
  })

  it('marks two tiles swapped inside a row as yellow, the rest of the row green', () => {
    const marks = gradeBoard(withSwap(cellIndex(0, 2), cellIndex(2, 2)), across, down)
    expect(marks[cellIndex(0, 2)]).toBe('yellow')
    expect(marks[cellIndex(2, 2)]).toBe('yellow')
    expect(marks[cellIndex(1, 2)]).toBe('green')
    expect(marks[cellIndex(3, 2)]).toBe('green')
    expect(marks[cellIndex(4, 2)]).toBe('green')
  })

  it('grades an outer tile against the single word it belongs to', () => {
    // Swapping (0,0) with (0,1) only disturbs the "fella" column for (0,1).
    const marks = gradeBoard(withSwap(cellIndex(0, 0), cellIndex(0, 1)), across, down)
    expect(marks[cellIndex(0, 1)]).toBe('yellow')
  })

  it('falls back to the down word when the across word does not contain the letter', () => {
    // A crossing tile is graded by its row first; here the row has nothing to
    // say, so the column decides.
    const marks = gradeBoard(withSwap(cellIndex(0, 0), cellIndex(0, 1)), across, down)
    expect(marks[cellIndex(0, 0)]).toBe('yellow')
  })

  it('leaves a letter that belongs to neither word plain', () => {
    const board = solution.slice()
    board[cellIndex(0, 2)] = 'q'
    expect(gradeBoard(board, across, down)[cellIndex(0, 2)]).toBe('')
  })
})
