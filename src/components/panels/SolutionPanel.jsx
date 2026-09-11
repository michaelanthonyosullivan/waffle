export default function SolutionPanel({ across, down, onRetry, onStats }) {
  return (
    <>
      <h3>Across</h3>
      <p>{across.join(', ')}</p>
      <h3>Down</h3>
      <p>{down.join(', ')}</p>
      <div className="modal-actions">
        <button className="button" type="button" onClick={onRetry}>
          Retry
        </button>
        <button className="button button--ghost" type="button" onClick={onStats}>
          Stats
        </button>
      </div>
    </>
  )
}
