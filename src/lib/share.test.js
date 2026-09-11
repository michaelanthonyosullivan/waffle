import { describe, expect, it } from 'vitest'

import { CELLS } from './core.js'
import { shareText } from './share.js'

const allGreen = CELLS.map(() => 'green')
const allPlain = CELLS.map(() => '')

describe('shareText', () => {
  it('writes a header and the board, with the gaps blank', () => {
    const lines = shareText({ mode: 'daily', number: 42, earnedStars: 5, marks: allGreen }).split('\n')

    expect(lines).toHaveLength(6)
    expect(lines[0]).toBe('Waffle #42 5/5')
    expect(lines[1]).toBe('🟩🟩🟩🟩🟩')
    expect(lines[2]).toBe('🟩⬜🟩⬜🟩')
    expect(lines[3]).toBe('🟩🟩🟩🟩🟩')
    expect(lines[4]).toBe('🟩⬜🟩⬜🟩')
    expect(lines[5]).toBe('🟩🟩🟩🟩🟩')
  })

  it('marks everything else black', () => {
    const lines = shareText({ mode: 'daily', number: 1, earnedStars: 0, marks: allPlain }).split('\n')
    expect(lines[1]).toBe('⬛⬛⬛⬛⬛')
    expect(lines[2]).toBe('⬛⬜⬛⬜⬛')
  })

  it('labels practice and archive games', () => {
    const practice = shareText({ mode: 'practice', number: 0, earnedStars: 3, marks: allGreen }).split('\n')[0]
    const archive = shareText({ mode: 'archive', number: 7, earnedStars: 2, marks: allGreen }).split('\n')[0]

    expect(practice).toBe('Waffle (practice) 3/5')
    expect(archive).toBe('Waffle #7 (archive) 2/5')
  })
})
