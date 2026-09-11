import { useMemo } from 'react'

import { todayNumber } from '../lib/dates.js'
import { summarise } from '../lib/results.js'

export default function StatsGrid({ summary }) {
  const computed = useMemo(() => summarise(todayNumber()), [])
  const stats = summary ?? computed

  const items = [
    ['Played', stats.played],
    ['Wins', stats.wins],
    ['Streak', stats.current],
    ['Best', stats.best],
  ]

  return (
    <dl className="stats">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}
