export default function Hud({ swapsRemaining, status }) {
  const shown = Math.max(0, swapsRemaining)
  const classes = ['hud']
  if (status === 'lost') classes.push('is-spent')
  if (status === 'won') classes.push('is-solved')

  return (
    <p className={classes.join(' ')} id="hud">
      <strong>{shown}</strong> <span>{shown === 1 ? 'swap remaining' : 'swaps remaining'}</span>
    </p>
  )
}
