import { describe, expect, it } from 'vitest'

import { DAY, EPOCH, dailyIndexFor, dateFor, formatDate, todayNumber } from './dates.js'

describe('puzzle numbering', () => {
  it('counts days from the epoch, starting at number one', () => {
    expect(todayNumber(new Date(2022, 1, 13))).toBe(1)
    expect(todayNumber(new Date(2022, 1, 14))).toBe(2)
    expect(todayNumber(new Date(2022, 2, 1))).toBe(17)
  })

  it('wraps puzzle numbers around the pool', () => {
    expect(dailyIndexFor(1, 10)).toBe(0)
    expect(dailyIndexFor(10, 10)).toBe(9)
    expect(dailyIndexFor(11, 10)).toBe(0)
    expect(dailyIndexFor(0, 10)).toBe(9)
  })

  it('maps a puzzle number back to its date', () => {
    expect(dateFor(1).getTime()).toBe(EPOCH)
    expect(dateFor(2).getTime()).toBe(EPOCH + DAY)
    expect(formatDate(dateFor(1))).toMatch(/2022/)
  })
})
