import { STAR_CAP } from '../lib/share.js'

export default function Stars({ earned }) {
  return (
    <div className="stars" aria-label={`${earned} of ${STAR_CAP} stars`}>
      {Array.from({ length: STAR_CAP }, (_, index) => (
        <span
          key={index}
          className={index < earned ? 'star is-earned' : 'star'}
          style={{ '--i': index }}
          aria-hidden="true"
        >
          ★
        </span>
      ))}
    </div>
  )
}
