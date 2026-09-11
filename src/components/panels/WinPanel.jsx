import Stars from '../Stars.jsx'
import StatsGrid from '../StatsGrid.jsx'

export default function WinPanel({ earnedStars, showStats, onShare, onStats, onPractice }) {
  return (
    <>
      <h3>{earnedStars > 0 ? 'Nicely done' : 'There in the end'}</h3>
      <p>
        {earnedStars > 0
          ? `Solved with ${earnedStars} ${earnedStars === 1 ? 'swap' : 'swaps'} to spare.`
          : 'You got there, but with no swaps left for stars.'}
      </p>
      <Stars earned={earnedStars} />
      {showStats ? <StatsGrid /> : null}
      <div className="modal-actions">
        <button className="button" type="button" onClick={onShare}>
          Share
        </button>
        <button className="button button--ghost" type="button" onClick={onStats}>
          Stats
        </button>
        <button className="button button--ghost" type="button" onClick={onPractice}>
          Practice
        </button>
      </div>
    </>
  )
}
