/* A single board tile. Position comes from the standalone `translate` property
 * so `scale`/`transform` stay free for the lift, pop and shake animations. */

const DESCRIPTIONS = {
  green: 'correct position',
  yellow: 'in one of its words, wrong position',
}

export default function Tile({
  tile,
  cell,
  x,
  y,
  step,
  mark,
  selected,
  flashing,
  shaking,
  moving,
  dragging,
  dropTarget,
  offset,
  onPointerDown,
  onKeyDown,
}) {
  const classes = ['tile']
  if (mark === 'green') classes.push('is-green')
  if (mark === 'yellow') classes.push('is-yellow')
  if (selected) classes.push('is-selected')
  if (flashing) classes.push('is-new-green')
  if (shaking) classes.push('is-shake')
  if (moving) classes.push('is-moving')
  if (dragging) classes.push('is-dragging')
  if (dropTarget) classes.push('is-drop')

  const translate = dragging
    ? `${x * step + offset.dx}px ${y * step + offset.dy}px`
    : `${x * step}px ${y * step}px`

  return (
    <div
      className={classes.join(' ')}
      role="gridcell"
      tabIndex={0}
      data-cell={cell}
      aria-label={`${tile.letter.toUpperCase()}, row ${y + 1}, column ${x + 1}: ${
        DESCRIPTIONS[mark] ?? 'not in any of its words'
      }`}
      style={{
        '--i': tile.id,
        translate,
        scale: dragging ? 1.09 : undefined,
        transition: dragging ? 'none' : undefined,
        zIndex: dragging ? 5 : undefined,
      }}
      onPointerDown={(event) => onPointerDown(event, tile)}
      onKeyDown={(event) => onKeyDown(event, tile)}
    >
      {tile.letter}
    </div>
  )
}
