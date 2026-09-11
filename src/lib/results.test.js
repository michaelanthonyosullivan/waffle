import { beforeEach, describe, expect, it } from 'vitest'

import { loadResults, recordResult, summarise } from './results.js'

const TODAY = 100

beforeEach(() => {
  localStorage.clear()
})

describe('results', () => {
  it('records a solved daily with its stars', () => {
    recordResult({ mode: 'daily', number: TODAY, won: true, stars: 4 })

    expect(loadResults()[String(TODAY)]).toBe(4)
    const summary = summarise(TODAY)
    expect(summary).toMatchObject({ played: 1, wins: 1, current: 1, best: 1 })
    expect(summary.distribution).toEqual([0, 0, 0, 1, 0])
  })

  it('records a loss without counting it as a win', () => {
    recordResult({ mode: 'daily', number: TODAY, won: false, stars: 0 })

    expect(loadResults()[String(TODAY)]).toBe(-1)
    expect(summarise(TODAY)).toMatchObject({ played: 1, wins: 0, current: 0, best: 0 })
  })

  it('keeps an unbroken run as a streak', () => {
    ;[97, 98, 99, 100].forEach((n) => recordResult({ mode: 'daily', number: n, won: true, stars: 3 }))
    expect(summarise(TODAY)).toMatchObject({ played: 4, current: 4, best: 4 })
  })

  it('breaks the streak on a gap or a loss', () => {
    recordResult({ mode: 'daily', number: 95, won: true, stars: 3 })
    recordResult({ mode: 'daily', number: 100, won: true, stars: 3 })
    expect(summarise(TODAY)).toMatchObject({ played: 2, current: 1, best: 1 })

    recordResult({ mode: 'daily', number: 99, won: false, stars: 0 })
    expect(summarise(TODAY)).toMatchObject({ played: 3, current: 1, best: 1 })
  })

  it('counts back from yesterday when today has not been played', () => {
    ;[98, 99].forEach((n) => recordResult({ mode: 'daily', number: n, won: true, stars: 2 }))
    expect(summarise(TODAY).current).toBe(2)
  })

  it('upgrades a recorded loss once the board is solved', () => {
    recordResult({ mode: 'daily', number: TODAY, won: false, stars: 0 })
    recordResult({ mode: 'daily', number: TODAY, won: true, stars: 0 })

    expect(loadResults()[String(TODAY)]).toBe(0)
    expect(summarise(TODAY)).toMatchObject({ wins: 1, current: 1 })
  })

  it('never lowers a better score', () => {
    recordResult({ mode: 'daily', number: TODAY, won: true, stars: 5 })
    recordResult({ mode: 'daily', number: TODAY, won: true, stars: 2 })
    expect(loadResults()[String(TODAY)]).toBe(5)
  })

  it('ignores practice and archive games', () => {
    recordResult({ mode: 'practice', number: 0, won: true, stars: 5 })
    recordResult({ mode: 'archive', number: 50, won: true, stars: 5 })
    expect(loadResults()).toEqual({})
  })

  it('survives corrupt stored data', () => {
    localStorage.setItem('waffle-clone:results', 'not json')
    expect(loadResults()).toEqual({})
    expect(() => summarise(TODAY)).not.toThrow()
  })
})
