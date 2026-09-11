import { useCallback, useEffect, useState } from 'react'

import Board from './components/Board.jsx'
import Controls from './components/Controls.jsx'
import Footer from './components/Footer.jsx'
import Header from './components/Header.jsx'
import Hud from './components/Hud.jsx'
import Modal from './components/Modal.jsx'
import Stars from './components/Stars.jsx'
import HowToPlay from './components/panels/HowToPlay.jsx'
import LosePanel from './components/panels/LosePanel.jsx'
import SolutionPanel from './components/panels/SolutionPanel.jsx'
import StatsPanel from './components/panels/StatsPanel.jsx'
import WinPanel from './components/panels/WinPanel.jsx'
import { useWaffleGame } from './hooks/useWaffleGame.js'
import { copyText, shareText } from './lib/share.js'
import * as Sound from './lib/sound.js'

const TITLES = {
  win: 'Success!',
  lose: 'Game over',
  solution: 'Solution',
  stats: 'Stats & archive',
  help: 'How to play',
}

export default function App() {
  const {
    attempt,
    mode,
    number,
    label,
    tiles,
    marks,
    lockedIds,
    selectedId,
    swapsRemaining,
    status,
    revealed,
    earnedStars,
    locked,
    across,
    down,
    flashIds,
    movingIds,
    shakeIds,
    dealing,
    startDaily,
    startArchive,
    startPractice,
    retry,
    swap,
    tap,
    clearSelection,
    reveal,
    unlockSound,
  } = useWaffleGame()

  // The result modal is derived from the game status; `panel` covers the
  // screens the player opens themselves, and dismissing a result is remembered
  // per status so solving after a loss still celebrates.
  const [panel, setPanel] = useState(null) // 'stats' | 'help' | 'solution'
  // A restored game that had already finished should not re-open its result.
  const [dismissedStatus, setDismissedStatus] = useState(status === 'playing' ? null : status)
  const [soundOn, setSoundOn] = useState(() => Sound.isEnabled())
  const [toast, setToast] = useState('')

  const resultPanel = status === 'playing' ? null : status === 'won' ? 'win' : 'lose'
  const modal = panel ?? (dismissedStatus === status ? null : resultPanel)

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(''), 2200)
    return () => clearTimeout(timer)
  }, [toast])

  const closeModal = useCallback(() => {
    setPanel(null)
    setDismissedStatus(status)
  }, [status])

  const openStats = useCallback(() => setPanel('stats'), [])
  const openHelp = useCallback(() => setPanel('help'), [])

  const reset = useCallback(() => {
    setPanel(null)
    setDismissedStatus(null)
  }, [])

  const handleShare = useCallback(() => {
    copyText(shareText({ mode, number, earnedStars, marks })).then((ok) =>
      setToast(ok ? 'Copied result to the clipboard' : 'Could not copy the result'),
    )
  }, [earnedStars, marks, mode, number])

  const handleToggleSound = useCallback(() => {
    const next = Sound.toggle()
    setSoundOn(next)
    if (next) Sound.complete()
  }, [])

  const handleDaily = useCallback(() => {
    reset()
    startDaily()
  }, [reset, startDaily])

  const handlePractice = useCallback(() => {
    reset()
    startPractice()
  }, [reset, startPractice])

  const handleRetry = useCallback(() => {
    reset()
    retry()
  }, [reset, retry])

  const handleReveal = useCallback(() => {
    reveal()
    setPanel('solution')
  }, [reveal])

  const handleArchive = useCallback(
    (n) => {
      reset()
      startArchive(n)
    },
    [reset, startArchive],
  )

  return (
    <div className="app">
      <Header label={label} />

      <main>
        <Board
          tiles={tiles}
          marks={marks}
          lockedIds={lockedIds}
          selectedId={selectedId}
          flashIds={flashIds}
          movingIds={movingIds}
          shakeIds={shakeIds}
          attempt={attempt}
          dealing={dealing}
          solved={status === 'won'}
          locked={locked}
          onTap={tap}
          onSwap={swap}
          onClearSelection={clearSelection}
          onUnlock={unlockSound}
        />
        <Hud swapsRemaining={swapsRemaining} status={status} />
        <Stars earned={earnedStars} />
        <Controls
          onDaily={handleDaily}
          onPractice={handlePractice}
          onStats={openStats}
          onShare={handleShare}
          onToggleSound={handleToggleSound}
          onHelp={openHelp}
          soundOn={soundOn}
          shareDisabled={status === 'playing' && !revealed}
        />
      </main>

      <Footer />

      <Modal open={modal !== null} title={modal ? TITLES[modal] : ''} onClose={closeModal}>
        {modal === 'win' ? (
          <WinPanel
            earnedStars={earnedStars}
            showStats={mode === 'daily'}
            onShare={handleShare}
            onStats={openStats}
            onPractice={handlePractice}
          />
        ) : null}
        {modal === 'lose' ? (
          <LosePanel
            showStats={mode === 'daily'}
            onKeepTrying={closeModal}
            onReveal={handleReveal}
            onRetry={handleRetry}
          />
        ) : null}
        {modal === 'solution' ? (
          <SolutionPanel across={across} down={down} onRetry={handleRetry} onStats={openStats} />
        ) : null}
        {modal === 'stats' ? <StatsPanel onPlayArchive={handleArchive} onClose={closeModal} /> : null}
        {modal === 'help' ? <HowToPlay onClose={closeModal} /> : null}
      </Modal>

      <div className={`toast${toast ? ' is-shown' : ''}`} role="status" aria-live="polite">
        {toast}
      </div>
    </div>
  )
}
