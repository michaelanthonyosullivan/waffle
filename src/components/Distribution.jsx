import { useMemo } from 'react'

import { todayNumber } from '../lib/dates.js'
import { summarise } from '../lib/results.js'
import { STAR_CAP } from '../lib/share.js'

export default function Distribution({ summary }) {
  const computed = useMemo(() => summarise(todayNumber()), [])
  const stats = summary ?? computed
  const max = Math.max(1, ...stats.distribution)

  const rows = []
  for (let stars = STAR_CAP; stars >= 1; stars -= 1) {
    rows.push([stars, stats.distribution[stars - 1]])
  }

  return (
    <div className="distribution">
      {rows.map(([stars, count]) => (
        <div className="distribution__row" key={stars}>
          <span className="distribution__label">{stars}★</span>
          <span className="distribution__bar">
            <span style={{ width: `${Math.round((count / max) * 100)}%` }} />
          </span>
          <span className="distribution__count">{count}</span>
        </div>
      ))}
    </div>
  )
}
