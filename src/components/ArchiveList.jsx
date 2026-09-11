import { useMemo } from 'react'

import { dateFor, formatDate, todayNumber } from '../lib/dates.js'
import { loadResults } from '../lib/results.js'
import { STAR_CAP } from '../lib/rules.js'

function Result({ value }) {
  if (value === undefined) return <span className="archive__result">Play</span>
  if (value < 0) return <span className="archive__result">✗</span>
  return (
    <span className="archive__result">
      {Array.from({ length: STAR_CAP }, (_, index) => (
        <span key={index} className={index < value ? 'on' : undefined}>
          ★
        </span>
      ))}
    </span>
  )
}

export default function ArchiveList({ onPlay, days = 30 }) {
  const today = todayNumber()
  const results = useMemo(() => loadResults(), [])

  const numbers = []
  for (let n = today - 1; n >= Math.max(1, today - days); n -= 1) numbers.push(n)

  return (
    <div className="archive">
      {numbers.map((n) => (
        <button className="archive__item" type="button" key={n} onClick={() => onPlay(n)}>
          <span>
            <strong>{`Waffle #${n}`}</strong>
            <span className="archive__date">{formatDate(dateFor(n))}</span>
          </span>
          <Result value={results[String(n)]} />
        </button>
      ))}
    </div>
  )
}
