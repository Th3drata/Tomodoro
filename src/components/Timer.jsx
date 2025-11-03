import { useState, useEffect } from 'react'
import { getCurrentUser } from '../firebase/auth'
import { addSession, addPomodoro, updateSession } from '../firebase/database'
import '../timer-fullscreen.css'

const CYCLES_BEFORE_LONG_BREAK = 4

export default function Timer({ onPomodoroComplete, settings, currentSession, setCurrentSession }) {
  const FOCUS_TIME = (settings?.focusTime || 35) * 60
  const BREAK_TIME = (settings?.breakTime || 8) * 60
  const LONG_BREAK_TIME = (settings?.longBreakTime || 20) * 60

  const [timeLeft, setTimeLeft] = useState(FOCUS_TIME)
  const [isRunning, setIsRunning] = useState(false)
  const [mode, setMode] = useState('focus') // 'focus', 'break', 'longBreak'
  const [cycle, setCycle] = useState(1)
  const [sessionTitle, setSessionTitle] = useState('')
  const [category, setCategory] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    let interval = null
    
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1)
      }, 1000)
    } else if (timeLeft === 0) {
      handleTimerComplete()
    }

    return () => clearInterval(interval)
  }, [isRunning, timeLeft])

  useEffect(() => {
    // Update page title
    const minutes = Math.floor(timeLeft / 60)
    const seconds = timeLeft % 60
    const modeText = mode === 'focus' ? 'Focus' : mode === 'break' ? 'Pause' : 'Pause Longue'
    document.title = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} - ${modeText}`
  }, [timeLeft, mode])

  // Reset timer when settings change
  useEffect(() => {
    if (!isRunning) {
      if (mode === 'focus') {
        setTimeLeft(FOCUS_TIME)
      } else if (mode === 'break') {
        setTimeLeft(BREAK_TIME)
      } else if (mode === 'longBreak') {
        setTimeLeft(LONG_BREAK_TIME)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings])

  const handleTimerComplete = async () => {
    // Play alarm
    playAlarm()
    
    if (mode === 'focus') {
      const user = getCurrentUser()
      if (!user) return
      
      // Save completed pomodoro to Firebase
      const pomodoroData = {
        sessionId: currentSession.id,
        category: currentSession.category,
        duration: FOCUS_TIME
      }
      
      try {
        await addPomodoro(user.uid, pomodoroData)
        
        // Update session counts in Firebase
        await updateSession(currentSession.id, {
          totalTime: currentSession.totalTime + FOCUS_TIME,
          pomodoros: currentSession.pomodoros + 1
        })
        
        // Update local state
        setCurrentSession(prev => ({
          ...prev,
          totalTime: prev.totalTime + FOCUS_TIME,
          pomodoros: prev.pomodoros + 1
        }))
        
        // Notify parent
        if (onPomodoroComplete) {
          onPomodoroComplete()
        }
      } catch (error) {
        console.error('Error saving pomodoro:', error)
      }
      
      // Move to break
      if (cycle >= CYCLES_BEFORE_LONG_BREAK) {
        setMode('longBreak')
        setTimeLeft(LONG_BREAK_TIME)
        setCycle(1)
      } else {
        setMode('break')
        setTimeLeft(BREAK_TIME)
        setCycle(cycle + 1)
      }
    } else {
      // Break is over
      setMode('focus')
      setTimeLeft(FOCUS_TIME)
    }
    
    setIsRunning(false)
  }

  const playAlarm = () => {
    // Simple notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Pomodoro Timer', {
        body: mode === 'focus' ? 'Temps de pause!' : 'Retour au travail!',
        icon: '🍅'
      })
    }
  }

  const startTimer = () => {
    if (!currentSession) {
      alert('Veuillez créer une session avant de commencer le timer')
      return
    }
    setIsRunning(true)
  }

  const pauseTimer = () => {
    setIsRunning(false)
  }

  const resetTimer = () => {
    setIsRunning(false)
    setMode('focus')
    setCycle(1)
    setTimeLeft(FOCUS_TIME)
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  useEffect(() => {
    const handleKeyPress = (e) => {
      // Ignorer si l'utilisateur tape dans un input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return
      }
      
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault()
        if (isRunning) {
          pauseTimer()
        } else {
          startTimer()
        }
      }
      
      if (e.code === 'KeyF') {
        e.preventDefault()
        toggleFullscreen()
      }
    }
    
    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [isRunning, currentSession])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error('Erreur fullscreen:', err)
      })
    } else {
      document.exitFullscreen()
    }
  }

  const createSession = async () => {
    if (!sessionTitle.trim()) {
      alert('Veuillez entrer un titre pour la session')
      return
    }
    
    if (!category) {
      alert('Veuillez choisir une catégorie')
      return
    }
    
    const user = getCurrentUser()
    if (!user) {
      alert('Vous devez être connecté')
      return
    }
    
    const sessionData = {
      title: sessionTitle,
      category: category,
      totalTime: 0,
      pomodoros: 0
    }
    
    try {
      const sessionId = await addSession(user.uid, sessionData)
      
      setCurrentSession({
        id: sessionId,
        ...sessionData,
        createdAt: new Date().toISOString()
      })
      setSessionTitle('')
      setCategory('')
    } catch (error) {
      console.error('Error creating session:', error)
      alert('Erreur lors de la création de la session')
    }
  }

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const modeText = mode === 'focus' ? 'Focus' : mode === 'break' ? 'Pause' : 'Pause Longue'

  if (isFullscreen) {
    return (
      <div className="timer-fullscreen">
        <button 
          onClick={toggleFullscreen} 
          className="btn-exit-fullscreen"
          title="Quitter le mode plein écran"
        >
          ⛶
        </button>
        
        <div className="fullscreen-content">
          <div className="fullscreen-cycle">
            <span>Cycle {cycle}/4</span>
          </div>
          
          <h2 className="fullscreen-mode">{modeText}</h2>
          
          <div className="fullscreen-time">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
          
          <div className="fullscreen-controls">
            {!isRunning ? (
              <button onClick={startTimer} className="btn-fullscreen-primary">Démarrer</button>
            ) : (
              <button onClick={pauseTimer} className="btn-fullscreen-secondary">Pause</button>
            )}
            <button onClick={resetTimer} className="btn-fullscreen-danger">Réinitialiser</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="timer-section">
      <div className="timer-card">
        <button 
          onClick={toggleFullscreen} 
          className="btn-fullscreen"
          title="Mode plein écran"
        >
          ⛶
        </button>

        {currentSession ? (
          <div className="session-info">
            <h3>{currentSession.title}</h3>
            <span className="category-badge">{currentSession.category}</span>
          </div>
        ) : null}

        <div className="cycle-indicator">
          <span>Cycle {cycle}/4</span>
        </div>

        <div className="timer-display">
          <h2 className="timer-mode">{modeText}</h2>
          <div className="time">{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</div>
        </div>

        <div className="timer-controls">
          {!isRunning ? (
            <button onClick={startTimer} className="btn btn-primary">Démarrer</button>
          ) : (
            <button onClick={pauseTimer} className="btn btn-secondary">Pause</button>
          )}
          <button onClick={resetTimer} className="btn btn-danger">Réinitialiser</button>
        </div>

        {!currentSession && (
          <div className="new-session">
            <h3>Nouvelle Session</h3>
            <input 
              type="text" 
              placeholder="Titre de la session" 
              className="input-field"
              value={sessionTitle}
              onChange={(e) => setSessionTitle(e.target.value)}
            />
            <div className="category-selector">
              <p className="category-label">Choisir une catégorie</p>
              <div className="category-grid">
                <button
                  type="button"
                  className={`category-option ${category === 'maths' ? 'selected' : ''}`}
                  onClick={() => setCategory('maths')}
                >
                  <span className="category-icon">📐</span>
                  <span>Maths</span>
                </button>
                <button
                  type="button"
                  className={`category-option ${category === 'physique' ? 'selected' : ''}`}
                  onClick={() => setCategory('physique')}
                >
                  <span className="category-icon">⚡</span>
                  <span>Physique</span>
                </button>
                <button
                  type="button"
                  className={`category-option ${category === 'chimie' ? 'selected' : ''}`}
                  onClick={() => setCategory('chimie')}
                >
                  <span className="category-icon">🧪</span>
                  <span>Chimie</span>
                </button>
                <button
                  type="button"
                  className={`category-option ${category === 'programmation' ? 'selected' : ''}`}
                  onClick={() => setCategory('programmation')}
                >
                  <span className="category-icon">💻</span>
                  <span>Programmation</span>
                </button>
                <button
                  type="button"
                  className={`category-option ${category === 'langues' ? 'selected' : ''}`}
                  onClick={() => setCategory('langues')}
                >
                  <span className="category-icon">🌍</span>
                  <span>Langues</span>
                </button>
                <button
                  type="button"
                  className={`category-option ${category === 'histoire' ? 'selected' : ''}`}
                  onClick={() => setCategory('histoire')}
                >
                  <span className="category-icon">📚</span>
                  <span>Histoire</span>
                </button>
                <button
                  type="button"
                  className={`category-option ${category === 'autre' ? 'selected' : ''}`}
                  onClick={() => setCategory('autre')}
                >
                  <span className="category-icon">✨</span>
                  <span>Autre</span>
                </button>
              </div>
            </div>
            <button onClick={createSession} className="btn btn-success">Créer Session</button>
          </div>
        )}
      </div>
    </div>
  )
}
