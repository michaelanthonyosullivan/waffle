/* Waffle — the shareable result. */

import { SIZE, cellIndex } from './core.js'

export const STAR_CAP = 5

/**
 * The emoji grid shared after a game: green squares for tiles in the right
 * place, black for the rest, and blank squares for the four gaps.
 */
export function shareText({ mode, number, earnedStars, marks }) {
  const who =
    mode === 'daily' ? `Waffle #${number}` : mode === 'archive' ? `Waffle #${number} (archive)` : 'Waffle (practice)'
  const lines = [`${who} ${earnedStars}/${STAR_CAP}`]

  for (let y = 0; y < SIZE; y += 1) {
    let row = ''
    for (let x = 0; x < SIZE; x += 1) {
      if (x % 2 === 1 && y % 2 === 1) {
        row += '⬜'
        continue
      }
      row += marks[cellIndex(x, y)] === 'green' ? '🟩' : '⬛'
    }
    lines.push(row)
  }
  return lines.join('\n')
}

function fallbackCopy(text) {
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.opacity = '0'
  document.body.appendChild(area)
  area.select()
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }
  document.body.removeChild(area)
  return ok
}

export async function copyText(text) {
  if (globalThis.navigator?.clipboard && globalThis.isSecureContext) {
    try {
      await globalThis.navigator.clipboard.writeText(text)
      return true
    } catch {
      return fallbackCopy(text)
    }
  }
  return fallbackCopy(text)
}
