import { useMemo } from 'react'

import { todayNumber } from '../../lib/dates.js'
import { summarise } from '../../lib/results.js'
import ArchiveList from '../ArchiveList.jsx'
import Distribution from '../Distribution.jsx'
import StatsGrid from '../StatsGrid.jsx'

export default function StatsPanel({ onPlayArchive, onClose, archiveDays = 30 }) {
  // Read once, when the panel opens, so the record stays put while it is up.
  const summary = useMemo(() => summarise(todayNumber()), [])

  return (
    <>
      <h3>Your record</h3>
      <StatsGrid summary={summary} />

      <h3>Star distribution</h3>
      <Distribution summary={summary} />

      <h3>Archive</h3>
      <p>
        The last {archiveDays} Waffles. Archive games do not count towards your streak.
      </p>
      <ArchiveList onPlay={onPlayArchive} days={archiveDays} />

      <div className="modal-actions">
        <button className="button" type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </>
  )
}
