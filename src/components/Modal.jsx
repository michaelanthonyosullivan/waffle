import { useEffect, useRef } from 'react'

export default function Modal({ open, title, onClose, children }) {
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    panelRef.current?.querySelector('button')?.focus()
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="modal"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="modal__panel" role="dialog" aria-modal="true" aria-labelledby="modal-title" ref={panelRef}>
        <div className="modal__head">
          <h2 id="modal-title">{title}</h2>
          <button className="modal__close" type="button" aria-label="Close" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  )
}
