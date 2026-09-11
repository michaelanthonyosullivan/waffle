export default function Controls({
  onDaily,
  onPractice,
  onStats,
  onShare,
  onToggleSound,
  onHelp,
  soundOn,
  shareDisabled,
}) {
  return (
    <>
      <div className="actions">
        <button className="button" type="button" onClick={onDaily}>
          Daily waffle
        </button>
        <button className="button button--ghost" type="button" onClick={onPractice}>
          Practice
        </button>
      </div>
      <div className="actions actions--sub">
        <button className="button button--ghost" type="button" onClick={onStats}>
          Stats &amp; archive
        </button>
        <button className="button button--ghost" type="button" onClick={onShare} disabled={shareDisabled}>
          Share
        </button>
        <button
          className="button button--ghost"
          type="button"
          onClick={onToggleSound}
          aria-pressed={soundOn}
        >
          {`Sound: ${soundOn ? 'on' : 'off'}`}
        </button>
        <button className="button button--ghost" type="button" onClick={onHelp}>
          How to play
        </button>
      </div>
    </>
  )
}
