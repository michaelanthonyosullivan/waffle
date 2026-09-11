/* Waffle — pure board logic. No DOM, no React.
 *
 * The board is a 5x5 grid with the four "inner corner" tiles missing, which
 * leaves 21 tiles in a waffle shape:
 *
 *     x x x x x
 *     x . x . x
 *     x x x x x
 *     x . x . x
 *     x x x x x
 *
 * Rows 0, 2 and 4 are complete across words and columns 0, 2 and 4 are complete
 * down words. Every other tile sits on the outer edge and belongs to just one
 * of those six words.
 */

export const SIZE = 5

// The 21 playable cells in reading order.
export const CELLS = []
for (let y = 0; y < SIZE; y += 1) {
  for (let x = 0; x < SIZE; x += 1) {
    if (x % 2 === 1 && y % 2 === 1) continue // the four gaps
    CELLS.push({ x, y })
  }
}

export const CELL_COUNT = CELLS.length

const CELL_LOOKUP = new Map(CELLS.map((cell, index) => [`${cell.x},${cell.y}`, index]))

export function cellIndex(x, y) {
  const index = CELL_LOOKUP.get(`${x},${y}`)
  return index === undefined ? -1 : index
}

/** The 21 solution letters, in cell order, for a set of across/down words. */
export function solutionLetters(across, down) {
  return CELLS.map((cell) => (cell.y % 2 === 0 ? across[cell.y / 2][cell.x] : down[cell.x / 2][cell.y]))
}

/**
 * Wordle-style grading of one word, handling repeated letters.
 * Returns an array of "green" / "yellow" / "" the same length as the guess.
 */
export function gradeWord(solutionWord, guessWord) {
  const marks = guessWord.split('').map(() => '')
  const remainingSolution = solutionWord.split('')
  const remainingGuess = guessWord.split('')

  for (let i = 0; i < remainingGuess.length; i += 1) {
    if (remainingGuess[i] === remainingSolution[i]) {
      marks[i] = 'green'
      remainingSolution[i] = null
      remainingGuess[i] = null
    }
  }
  for (let i = 0; i < remainingGuess.length; i += 1) {
    if (!remainingGuess[i]) continue
    const found = remainingSolution.indexOf(remainingGuess[i])
    if (found >= 0) {
      marks[i] = 'yellow'
      remainingSolution[found] = null
    }
  }
  return marks
}

/**
 * Grade every cell of a board.
 *
 * `letters` is the current arrangement in cell order. A tile is green when it
 * matches the solution at that cell, otherwise it is graded against its across
 * word (or its down word, for tiles on the outer edge).
 */
export function gradeBoard(letters, across, down) {
  const letterAt = (x, y) => letters[cellIndex(x, y)]
  const solution = solutionLetters(across, down)
  const marks = CELLS.map(() => '')

  CELLS.forEach((cell, index) => {
    const { x, y } = cell
    const letter = letters[index]

    if (solution[index] === letter) {
      marks[index] = 'green'
      return
    }
    if (y % 2 === 0) {
      let guess = ''
      for (let column = 0; column < SIZE; column += 1) guess += letterAt(column, y)
      const mark = gradeWord(across[y / 2], guess)[x]
      if (mark) {
        marks[index] = mark
        return
      }
    }
    if (x % 2 === 0) {
      let guess = ''
      for (let row = 0; row < SIZE; row += 1) guess += letterAt(x, row)
      const mark = gradeWord(down[x / 2], guess)[y]
      if (mark) marks[index] = mark
    }
  })
  return marks
}

export function isSolved(letters, solution) {
  return letters.every((letter, index) => letter === solution[index])
}
