/* Waffle — sound effects.
 *
 * Synthesised with the Web Audio API so there are no audio files to ship.  The
 * module is inert when there is no AudioContext (tests, older browsers) and
 * while the player has muted it.
 */

const KEY = 'waffle-clone:sound'

// A bright major arpeggio for a win, and a fall for a loss.
const WIN_NOTES = [523.25, 659.25, 783.99, 1046.5]
const LOSE_NOTES = [392, 329.63, 261.63]

let enabled = readEnabled()
let context = null

function readEnabled() {
  try {
    const stored = globalThis.localStorage?.getItem(KEY)
    return stored === null || stored === undefined ? true : stored === 'on'
  } catch {
    return true
  }
}

function writeEnabled() {
  try {
    globalThis.localStorage?.setItem(KEY, enabled ? 'on' : 'off')
  } catch {
    /* private mode: the setting just will not persist */
  }
}

function audio() {
  if (context) return context
  const Ctor = globalThis.AudioContext || globalThis.webkitAudioContext
  if (!Ctor) return null
  try {
    context = new Ctor()
  } catch {
    context = null
  }
  return context
}

/** Browsers start audio suspended; call this on the first user gesture. */
export function unlock() {
  const ctx = audio()
  if (ctx && ctx.state === 'suspended' && ctx.resume) {
    const resumed = ctx.resume()
    if (resumed && resumed.catch) resumed.catch(() => {})
  }
}

function blip({ freq, to, duration, type, gain, delay = 0 }) {
  if (!enabled) return
  const ctx = audio()
  if (!ctx) return

  const start = ctx.currentTime + delay
  const peak = gain ?? 0.07

  const osc = ctx.createOscillator()
  const amp = ctx.createGain()
  osc.type = type ?? 'sine'
  osc.frequency.setValueAtTime(freq, start)
  if (to) osc.frequency.exponentialRampToValueAtTime(to, start + duration)

  // A short ramp in avoids clicks; exponential ramps need positive values.
  amp.gain.setValueAtTime(0.0001, start)
  amp.gain.exponentialRampToValueAtTime(peak, start + Math.min(0.02, duration / 3))
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration)

  osc.connect(amp)
  amp.connect(ctx.destination)
  osc.start(start)
  osc.stop(start + duration + 0.02)
}

function arpeggio(notes, { duration, type, gain, spacing }) {
  notes.forEach((freq, index) => {
    blip({ freq, duration, type, gain, delay: index * spacing })
  })
}

export function isEnabled() {
  return enabled
}

export function setEnabled(value) {
  enabled = Boolean(value)
  writeEnabled()
  if (enabled) unlock()
  return enabled
}

export function toggle() {
  enabled = !enabled
  writeEnabled()
  if (enabled) unlock()
  return enabled
}

export function swap() {
  blip({ freq: 520, to: 760, duration: 0.09, type: 'triangle', gain: 0.06 })
}

export function invalid() {
  blip({ freq: 170, to: 120, duration: 0.15, type: 'sawtooth', gain: 0.05 })
}

export function complete() {
  blip({ freq: 880, duration: 0.24, type: 'sine', gain: 0.05 })
  blip({ freq: 1318.5, duration: 0.2, type: 'sine', gain: 0.03, delay: 0.05 })
}

export function win() {
  arpeggio(WIN_NOTES, { duration: 0.3, type: 'sine', gain: 0.08, spacing: 0.1 })
}

export function lose() {
  arpeggio(LOSE_NOTES, { duration: 0.32, type: 'triangle', gain: 0.07, spacing: 0.12 })
}
