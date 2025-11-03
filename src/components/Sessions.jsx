import { useState, useEffect } from 'react'
import { getCurrentUser } from '../firebase/auth'
import { updateSession, deleteSession as deleteSessionFromDB, getPomodoros, updatePomodoro as updatePomodoroInDB, deletePomodoro as deletePomodoroFromDB } from '../firebase/database'

export default function Sessions({ sessions = [], currentSession, setCurrentSession, onNavigateToTimer }) {
  const [editingSession, setEditingSession] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [sessionPomodoros, setSessionPomodoros] = useState([])
  const [originalPomodoros, setOriginalPomodoros] = useState([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [sessionTitle, setSessionTitle] = useState('')
  const [category, setCategory] = useState('')

  // Générer des variations de couleur pour le gradient
  const generateGradientColors = () => {
    const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
    
    // Fonction pour modifier la luminosité/saturation d'une couleur hex
    const adjustColor = (hex, lightness, saturation) => {
      // Convertir hex en RGB
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      
      // Convertir en HSL
      const rNorm = r / 255
      const gNorm = g / 255
      const bNorm = b / 255
      
      const max = Math.max(rNorm, gNorm, bNorm)
      const min = Math.min(rNorm, gNorm, bNorm)
      let h, s, l = (max + min) / 2
      
      if (max === min) {
        h = s = 0
      } else {
        const d = max - min
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
        
        switch (max) {
          case rNorm: h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6; break
          case gNorm: h = ((bNorm - rNorm) / d + 2) / 6; break
          case bNorm: h = ((rNorm - gNorm) / d + 4) / 6; break
        }
      }
      
      // Ajuster
      l = Math.max(0, Math.min(1, l + lightness))
      s = Math.max(0, Math.min(1, s + saturation))
      
      // Reconvertir en RGB
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1
        if (t > 1) t -= 1
        if (t < 1/6) return p + (q - p) * 6 * t
        if (t < 1/2) return q
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
        return p
      }
      
      let rNew, gNew, bNew
      if (s === 0) {
        rNew = gNew = bNew = l
      } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s
        const p = 2 * l - q
        rNew = hue2rgb(p, q, h + 1/3)
        gNew = hue2rgb(p, q, h)
        bNew = hue2rgb(p, q, h - 1/3)
      }
      
      const toHex = (val) => {
        const hex = Math.round(val * 255).toString(16)
        return hex.length === 1 ? '0' + hex : hex
      }
      
      return `#${toHex(rNew)}${toHex(gNew)}${toHex(bNew)}`
    }
    
    // Créer 4 variations
    const color1 = accentColor
    const color2 = adjustColor(accentColor, 0.1, 0.2)  // Plus clair et saturé
    const color3 = adjustColor(accentColor, -0.1, 0.1) // Plus foncé
    const color4 = adjustColor(accentColor, 0.15, 0.3) // Très lumineux
    
    return `linear-gradient(90deg, ${color1}, ${color2}, ${color3}, ${color4}, ${color1})`
  }

  const startEditing = async (session) => {
    setEditingSession(session)
    setEditTitle(session.title)
    
    // Charger les pomodoros de cette session
    const user = getCurrentUser()
    if (user) {
      try {
        const allPomodoros = await getPomodoros(user.uid)
        const sessionPoms = allPomodoros.filter(p => p.sessionId === session.id)
        setSessionPomodoros(sessionPoms)
        setOriginalPomodoros(sessionPoms)
      } catch (error) {
        console.error('Erreur lors du chargement des pomodoros:', error)
        setSessionPomodoros([])
        setOriginalPomodoros([])
      }
    }
  }

  const cancelEditing = () => {
    setEditingSession(null)
    setEditTitle('')
    setSessionPomodoros([])
    setOriginalPomodoros([])
  }

  const saveEdit = async () => {
    // Conserver le titre original si vide
    const finalTitle = editTitle.trim() || editingSession.title

    try {
      // Mettre à jour les pomodoros modifiés ou supprimés
      for (const pom of sessionPomodoros) {
        const original = originalPomodoros.find(p => p.id === pom.id)
        if (original && original.duration !== pom.duration) {
          // Le pomodoro a été modifié
          await updatePomodoroInDB(pom.id, { duration: pom.duration })
        }
      }

      // Supprimer les pomodoros qui ont été supprimés
      const deletedPomIds = originalPomodoros
        .filter(orig => !sessionPomodoros.find(p => p.id === orig.id))
        .map(p => p.id)
      
      for (const pomId of deletedPomIds) {
        await deletePomodoroFromDB(pomId)
      }

      // Calculer le temps total mis à jour
      const totalTime = sessionPomodoros.reduce((sum, p) => sum + p.duration, 0)

      // Mettre à jour la session
      await updateSession(editingSession.id, { 
        title: finalTitle,
        pomodoros: sessionPomodoros.length,
        totalTime
      })
      
      cancelEditing()
    } catch (error) {
      console.error('Error updating session:', error)
      alert('Erreur lors de la mise à jour de la session')
    }
  }

  const updatePomodoroTime = (pomodoroId, newDuration) => {
    setSessionPomodoros(prev => 
      prev.map(p => p.id === pomodoroId ? { ...p, duration: newDuration } : p)
    )
  }

  const deletePomodoro = (pomodoroId) => {
    if (!confirm('Supprimer ce pomodoro ?')) return
    
    setSessionPomodoros(prev => prev.filter(p => p.id !== pomodoroId))
  }

  const deleteSession = async (sessionId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette session et tous ses pomodoros?')) {
      return
    }
    
    const user = getCurrentUser()
    if (!user) return

    try {
      // Delete session
      await deleteSessionFromDB(sessionId)
      
      // If this was the active session, clear it
      if (currentSession?.id === sessionId) {
        setCurrentSession(null)
      }
      
      // TODO: Delete associated pomodoros
      // For now, they'll remain orphaned but won't show up anywhere
    } catch (error) {
      console.error('Error deleting session:', error)
      alert('Erreur lors de la suppression de la session')
    }
  }

  const selectSession = (session) => {
    setCurrentSession(session)
    onNavigateToTimer()
  }

  const quitSession = () => {
    if (confirm('Voulez-vous quitter cette session?')) {
      setCurrentSession(null)
    }
  }

  const createNewSession = async () => {
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
      const { addSession } = await import('../firebase/database')
      const sessionId = await addSession(user.uid, sessionData)
      
      const newSession = {
        id: sessionId,
        ...sessionData,
        createdAt: new Date().toISOString()
      }
      
      setCurrentSession(newSession)
      setSessionTitle('')
      setCategory('')
      setShowCreateForm(false)
      onNavigateToTimer()
    } catch (error) {
      console.error('Error creating session:', error)
      alert('Erreur lors de la création de la session')
    }
  }

  return (
    <div className="sessions-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0 }}>Mes Sessions</h2>
        <button 
          className="btn btn-success" 
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={{
            width: '40px',
            height: '40px',
            padding: 0,
            borderRadius: '8px',
            fontSize: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title={showCreateForm ? 'Annuler' : 'Créer une nouvelle session'}
        >
          {showCreateForm ? '×' : '+'}
        </button>
      </div>

      {showCreateForm && (
        <div className="session-card" style={{ marginBottom: '1.5rem', background: 'var(--card-bg)' }}>
          <h3>Nouvelle Session</h3>
          <input 
            type="text" 
            placeholder="Titre de la session" 
            className="input-field"
            value={sessionTitle}
            onChange={(e) => setSessionTitle(e.target.value)}
            style={{ marginBottom: '1rem' }}
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
          <button onClick={createNewSession} className="btn btn-success" style={{ marginTop: '1rem' }}>
            Créer et utiliser
          </button>
        </div>
      )}


      {sessions.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '2rem' }}>
          Aucune session créée. Créez votre première session dans le Timer!
        </p>
      ) : (
        <div className="sessions-grid">
          {sessions.map(session => {
            const hours = Math.floor(session.totalTime / 3600)
            const minutes = Math.floor((session.totalTime % 3600) / 60)
            const isActive = currentSession?.id === session.id
            
            const gradientColors = isActive ? generateGradientColors() : ''
            
            return (
              <div 
                key={session.id} 
                className={`session-card ${isActive ? 'active-session-glow' : ''}`}
                style={isActive ? {
                  border: '3px solid transparent',
                  background: `linear-gradient(var(--bg-card), var(--bg-card)) padding-box, ${gradientColors} border-box`,
                  backgroundSize: '100% 100%, 300% 100%',
                  animation: 'borderGlow 3s linear infinite',
                  boxShadow: `0 0 20px ${getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()}80, 0 4px 16px rgba(0, 0, 0, 0.3)`,
                  position: 'relative'
                } : {}}
              >
                {isActive && (
                  <div style={{ 
                    position: 'absolute', 
                    top: '-12px', 
                    left: '50%', 
                    transform: 'translateX(-50%)',
                    background: 'var(--accent)',
                    color: 'white',
                    padding: '0.3rem 0.8rem',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}>
                    ✅ Session active
                  </div>
                )}
                <>
                    <h3>{session.title}</h3>
                    <span className="category-badge">{session.category}</span>
                    <div className="session-time">Temps total: {hours}h {minutes}m</div>
                    <div className="session-pomodoros">🍅 {session.pomodoros} pomodoros</div>
                    <div className="session-actions">
                      {isActive ? (
                        <button 
                          className="btn btn-danger btn-small" 
                          onClick={quitSession}
                        >
                          Quitter session
                        </button>
                      ) : (
                        <button 
                          className="btn btn-primary btn-small" 
                          onClick={() => selectSession(session)}
                        >
                          Sélectionner
                        </button>
                      )}
                      <button 
                        className="btn btn-secondary btn-small"
                        onClick={() => startEditing(session)}
                      >
                        Éditer
                      </button>
                      <button 
                        className="btn btn-danger btn-small" 
                        onClick={() => deleteSession(session.id)}
                      >
                        Supprimer
                      </button>
                    </div>
                </>
              </div>
            )
          })}
        </div>
      )}

      {/* Modale d'édition */}
      {editingSession && (
        <div className="modal-overlay" onClick={cancelEditing}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h3>Éditer la session</h3>
              <button className="modal-close" onClick={cancelEditing}>×</button>
            </div>
            <div className="modal-body">
              <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block', fontWeight: 600 }}>Titre de la session</label>
              <input 
                type="text" 
                className="input-field"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                style={{ marginBottom: '1.5rem' }}
              />

              <h4 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Pomodoros ({sessionPomodoros.length})</h4>
              
              {sessionPomodoros.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>Aucun pomodoro dans cette session</p>
              ) : (
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {sessionPomodoros.map((pom, idx) => (
                    <div key={pom.id || idx} style={{
                      background: 'var(--bg-secondary)',
                      padding: '1rem',
                      borderRadius: '8px',
                      marginBottom: '0.75rem',
                      display: 'flex',
                      gap: '1rem',
                      alignItems: 'center'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                          {new Date(pom.date).toLocaleString('fr-FR')}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <span>Durée:</span>
                          <input 
                            type="number"
                            value={Math.round(pom.duration / 60)}
                            onChange={(e) => updatePomodoroTime(pom.id, (parseInt(e.target.value) || 0) * 60)}
                            style={{
                              width: '70px',
                              padding: '0.3rem 0.5rem',
                              background: 'var(--bg-hover)',
                              border: '1px solid var(--border)',
                              borderRadius: '4px',
                              color: 'var(--text-primary)'
                            }}
                          />
                          <span>min</span>
                        </div>
                      </div>
                      <button 
                        className="btn btn-danger btn-small"
                        onClick={() => deletePomodoro(pom.id)}
                        style={{ padding: '0.4rem 0.8rem' }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={cancelEditing}>
                  Annuler
                </button>
                <button className="btn btn-success" onClick={saveEdit}>
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
