/* Waffle clone — sound effects.
 *
 * Synthesised with the Web Audio API so there are no audio files to ship.  The
 * whole module is inert when there is no AudioContext (Node, older browsers)
 * and while the player has muted it.
 */

(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.WaffleSound = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  const KEY = "waffle-clone:sound";

  // Clap of notes used by win(): a bright major arpeggio.
  const WIN_NOTES = [523.25, 659.25, 783.99, 1046.5];
  const LOSE_NOTES = [392, 329.63, 261.63];

  let enabled = readEnabled();
  let context = null;

  function readEnabled() {
    try {
      const stored = root.localStorage && root.localStorage.getItem(KEY);
      return stored === null || stored === undefined ? true : stored === "on";
    } catch (error) {
      return true;
    }
  }

  function writeEnabled() {
    try {
      if (root.localStorage) root.localStorage.setItem(KEY, enabled ? "on" : "off");
    } catch (error) {
      /* private mode: the setting just will not persist */
    }
  }

  function audio() {
    if (context) return context;
    const Ctor = root.AudioContext || root.webkitAudioContext;
    if (!Ctor) return null;
    try {
      context = new Ctor();
    } catch (error) {
      context = null;
    }
    return context;
  }

  /** Browsers start audio suspended until a gesture; call this on first input. */
  function unlock() {
    const ctx = audio();
    if (ctx && ctx.state === "suspended" && ctx.resume) {
      const resumed = ctx.resume();
      if (resumed && resumed.catch) resumed.catch(() => {});
    }
  }

  function blip(options) {
    if (!enabled) return;
    const ctx = audio();
    if (!ctx) return;

    const start = ctx.currentTime + (options.delay || 0);
    const duration = options.duration;
    const peak = options.gain || 0.07;

    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = options.type || "sine";
    osc.frequency.setValueAtTime(options.freq, start);
    if (options.to) osc.frequency.exponentialRampToValueAtTime(options.to, start + duration);

    // A short ramp in avoids clicks; exponential ramps need positive values.
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(peak, start + Math.min(0.02, duration / 3));
    amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(amp);
    amp.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  function arpeggio(notes, options) {
    notes.forEach((freq, index) => {
      blip({
        freq,
        duration: options.duration,
        type: options.type,
        gain: options.gain,
        delay: index * options.spacing,
      });
    });
  }

  return {
    isEnabled() {
      return enabled;
    },
    setEnabled(value) {
      enabled = Boolean(value);
      writeEnabled();
      if (enabled) unlock();
      return enabled;
    },
    toggle() {
      enabled = !enabled;
      writeEnabled();
      if (enabled) unlock();
      return enabled;
    },
    unlock,
    swap() {
      blip({ freq: 520, to: 760, duration: 0.09, type: "triangle", gain: 0.06 });
    },
    invalid() {
      blip({ freq: 170, to: 120, duration: 0.15, type: "sawtooth", gain: 0.05 });
    },
    complete() {
      blip({ freq: 880, duration: 0.24, type: "sine", gain: 0.05 });
      blip({ freq: 1318.5, duration: 0.2, type: "sine", gain: 0.03, delay: 0.05 });
    },
    win() {
      arpeggio(WIN_NOTES, { duration: 0.3, type: "sine", gain: 0.08, spacing: 0.1 });
    },
    lose() {
      arpeggio(LOSE_NOTES, { duration: 0.32, type: "triangle", gain: 0.07, spacing: 0.12 });
    },
  };
});
