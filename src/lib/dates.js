/* Waffle — puzzle numbering and dates. */

export const DAY = 86400000
export const EPOCH = Date.UTC(2022, 1, 13) // puzzle #1

/** Today's puzzle number, counted from the local calendar date. */
export function todayNumber(now = new Date()) {
  const utcMidnight = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.floor((utcMidnight - EPOCH) / DAY) + 1
}

/** Puzzle numbers index into the daily pool, which cycles once exhausted. */
export function dailyIndexFor(puzzleNumber, length) {
  return (((puzzleNumber - 1) % length) + length) % length
}

export function dateFor(puzzleNumber) {
  return new Date(EPOCH + (puzzleNumber - 1) * DAY)
}

export function formatDate(date) {
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}
