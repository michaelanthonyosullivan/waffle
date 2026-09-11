import StatsGrid from '../StatsGrid.jsx'

export default function LosePanel({ showStats, onKeepTrying, onReveal, onRetry }) {
  return (
    <>
      <h3>Out of swaps</h3>
      <p>No stars this time, but you can keep swapping and still try to solve it.</p>
      {showStats ? <StatsGrid /> : null}
      <div className="modal-actions">
        <button className="button" type="button" onClick={onKeepTrying}>
          Keep trying
        </button>
        <button className="button button--ghost" type="button" onClick={onReveal}>
          Show solution
        </button>
        <button className="button button--ghost" type="button" onClick={onRetry}>
          Retry
        </button>
      </div>
    </>
  )
}
