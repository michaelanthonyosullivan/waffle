/* Waffle — per-puzzle results, streaks and stats.
 *
 * Results are stored as `{ [puzzleNumber]: stars }` where stars is 0-5 for a
 * solved board and -1 for a loss, so the streak can be recomputed from the
 * dates rather than being tracked as a counter.
 */

const KEY = 'waffle-clone:results'

export function loadResults() {
  try {
    const raw = globalThis.localStorage?.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function saveResults(results) {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(results))
  } catch {
    /* private mode: results just will not persist */
  }
}

export function recordResult({ mode, number, won, stars }) {
  if (mode !== 'daily') return
  const results = loadResults()
  const key = String(number)
  const existing = results[key]

  if (won) {
    if (existing === undefined || existing < 0 || stars > existing) results[key] = stars
    else return
  } else {
    if (existing !== undefined) return
    results[key] = -1
  }
  saveResults(results)
}

export function summarise(today) {
  const results = loadResults()
  const numbers = Object.keys(results)
    .map(Number)
    .sort((a, b) => a - b)

  const distribution = [0, 0, 0, 0, 0]
  let wins = 0
  numbers.forEach((n) => {
    const stars = results[String(n)]
    if (stars >= 0) {
      wins += 1
      if (stars > 0) distribution[stars - 1] += 1
    }
  })

  // Best run of consecutive solved days.
  let best = 0
  let run = 0
  let previous = null
  numbers.forEach((n) => {
    if (results[String(n)] >= 0) {
      run = previous !== null && n === previous + 1 ? run + 1 : 1
      best = Math.max(best, run)
    } else {
      run = 0
    }
    previous = n
  })

  // Current run, counting back from today (or yesterday if today is unplayed).
  let current = 0
  let cursor = results[String(today)] !== undefined ? today : today - 1
  while (results[String(cursor)] !== undefined && results[String(cursor)] >= 0) {
    current += 1
    cursor -= 1
  }

  return { played: numbers.length, wins, best, current, distribution, results }
}
