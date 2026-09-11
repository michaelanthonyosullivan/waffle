import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { CELLS, CELL_COUNT, SIZE, cellIndex } from '../lib/core.js'
import Tile from './Tile.jsx'

const INITIAL_METRICS = { size: 56, gap: 6 }

/**
 * The 21 tiles laid out on the waffle grid.
 *
 * Tiles are positioned by `translate` and moved by swapping their cell in
 * state, so the same DOM node slides to its new home via a CSS transition.
 * Dragging writes the offset straight into state; the drop target is found by
 * distance from the pointer, skipping locked (green) tiles.
 */
export default function Board({
  tiles,
  marks,
  lockedIds,
  selectedId,
  flashIds,
  movingIds,
  shakeIds,
  attempt,
  dealing,
  solved,
  locked,
  onTap,
  onSwap,
  onClearSelection,
  onUnlock,
}) {
  const boardRef = useRef(null)
  const metricsRef = useRef(INITIAL_METRICS)
  const [metrics, setMetrics] = useState(INITIAL_METRICS)
  const [drag, setDrag] = useState(null)
  const dragCleanup = useRef(null)

  useLayoutEffect(() => {
    const el = boardRef.current
    if (!el) return undefined

    const measure = () => {
      const width = el.clientWidth
      if (!width) return
      const gap = Math.max(4, width * 0.016)
      const size = (width - gap * (SIZE - 1)) / SIZE
      metricsRef.current = { size, gap }
      setMetrics({ size, gap })
    }

    measure()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure)
      return () => window.removeEventListener('resize', measure)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Safety net: never leave pointer listeners attached if we unmount mid-drag.
  useEffect(() => () => dragCleanup.current?.(), [])

  const grid = useMemo(() => {
    const cells = new Array(CELL_COUNT)
    tiles.forEach((tile) => {
      cells[tile.cell] = tile
    })
    return cells
  }, [tiles])

  const nearest = useCallback(
    (clientX, clientY) => {
      const el = boardRef.current
      if (!el) return null
      const rect = el.getBoundingClientRect()
      const { size, gap } = metricsRef.current
      const step = size + gap

      let best = null
      let bestDistance = Infinity
      for (let i = 0; i < CELL_COUNT; i += 1) {
        const tile = grid[i]
        if (!tile || lockedIds.has(tile.id)) continue
        const { x, y } = CELLS[i]
        const dx = rect.left + x * step + size / 2 - clientX
        const dy = rect.top + y * step + size / 2 - clientY
        const distance = Math.hypot(dx, dy)
        if (distance < bestDistance) {
          bestDistance = distance
          best = tile
        }
      }
      return best
    },
    [grid, lockedIds],
  )

  const handlePointerDown = useCallback(
    (event, tile) => {
      if (event.button !== undefined && event.button !== 0) return
      onUnlock()

      // A green tile cannot move; tapping it shakes and reports itself.
      if (lockedIds.has(tile.id)) {
        onTap(tile.id)
        return
      }
      if (locked) return

      event.preventDefault?.()
      try {
        event.currentTarget?.setPointerCapture?.(event.pointerId)
      } catch {
        /* the pointer may already be gone */
      }

      const { clientX: startX, clientY: startY, pointerId } = event
      let moved = false
      let dropId = null

      setDrag({ id: tile.id, dx: 0, dy: 0, moved: false, dropId: null })

      const move = (moveEvent) => {
        if (pointerId !== undefined && moveEvent.pointerId !== undefined && moveEvent.pointerId !== pointerId) {
          return
        }
        const dx = moveEvent.clientX - startX
        const dy = moveEvent.clientY - startY
        if (!moved && Math.hypot(dx, dy) > 6) moved = true
        const target = moved ? nearest(moveEvent.clientX, moveEvent.clientY) : null
        dropId = target && target.id !== tile.id ? target.id : null
        setDrag({ id: tile.id, dx, dy, moved, dropId })
      }

      const finish = (cancelled) => {
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
        window.removeEventListener('pointercancel', cancel)
        dragCleanup.current = null
        setDrag(null)
        if (cancelled) return
        if (!moved) onTap(tile.id)
        else if (dropId) onSwap(tile.id, dropId)
      }
      const up = () => finish(false)
      const cancel = () => finish(true)

      dragCleanup.current = () => finish(true)
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
      window.addEventListener('pointercancel', cancel)
    },
    [locked, lockedIds, nearest, onSwap, onTap, onUnlock],
  )

  const handleKeyDown = useCallback(
    (event, tile) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onUnlock()
        onTap(tile.id)
        return
      }
      if (event.key === 'Escape') {
        onClearSelection()
        return
      }

      const { x, y } = CELLS[tile.cell]
      let dx = 0
      let dy = 0
      if (event.key === 'ArrowUp') dy = -1
      else if (event.key === 'ArrowDown') dy = 1
      else if (event.key === 'ArrowLeft') dx = -1
      else if (event.key === 'ArrowRight') dx = 1
      else return

      event.preventDefault()
      let nx = x + dx
      let ny = y + dy
      while (nx >= 0 && nx < SIZE && ny >= 0 && ny < SIZE) {
        const index = cellIndex(nx, ny)
        if (index >= 0) {
          boardRef.current?.querySelector(`[data-cell="${index}"]`)?.focus()
          return
        }
        nx += dx
        ny += dy
      }
    },
    [onClearSelection, onTap, onUnlock],
  )

  const classes = ['board']
  if (dealing) classes.push('is-dealing')
  if (solved) classes.push('is-solved')

  const step = metrics.size + metrics.gap

  return (
    <div
      ref={boardRef}
      id="board"
      className={classes.join(' ')}
      role="grid"
      aria-label="Waffle board"
      style={{
        '--tile': `${metrics.size}px`,
        '--gap': `${metrics.gap}px`,
        height: `${metrics.size * SIZE + metrics.gap * (SIZE - 1)}px`,
      }}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClearSelection()
      }}
    >
      {tiles.map((tile) => {
        const { x, y } = CELLS[tile.cell]
        const dragging = drag?.id === tile.id
        return (
          <Tile
            key={`${attempt}:${tile.id}`}
            tile={tile}
            cell={tile.cell}
            x={x}
            y={y}
            step={step}
            mark={marks[tile.cell]}
            selected={selectedId === tile.id}
            flashing={flashIds.includes(tile.id)}
            shaking={shakeIds.includes(tile.id)}
            moving={movingIds.includes(tile.id)}
            dragging={dragging}
            dropTarget={Boolean(drag?.dropId === tile.id)}
            offset={dragging ? drag : null}
            onPointerDown={handlePointerDown}
            onKeyDown={handleKeyDown}
          />
        )
      })}
    </div>
  )
}
