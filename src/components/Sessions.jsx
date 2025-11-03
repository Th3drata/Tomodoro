import { useState } from 'react'
import { getCurrentUser } from '../firebase/auth'
import { updateSession, deleteSession as deleteSessionFromDB, getPomodoros } from '../firebase/database'

export default function Sessions({ sessions = [], currentSession, setCurrentSession, onNavigateToTimer }) {
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [sessionTitle, setSessionTitle] = useState('')
  const [category, setCategory] = useState('')

  const startEditing = (session) => {
    setEditingId(session.id)
    setEditTitle(session.title)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditTitle('')
  }

  const saveEdit = async (sessionId) => {
    if (!editTitle.trim()) {
      alert('Le titre ne peut pas être vide')
      return
    }

    try {
      await updateSession(sessionId, { title: editTitle.trim() })
      cancelEditing()
    } catch (error) {
      console.error('Error updating session:', error)
      alert('Erreur lors de la mise à jour de la session')
    }
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>Mes Sessions</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {currentSession && (
            <button className="btn btn-danger btn-small" onClick={quitSession}>
              Quitter session
            </button>
          )}
          <button className="btn btn-success btn-small" onClick={() => setShowCreateForm(!showCreateForm)}>
            {showCreateForm ? 'Annuler' : 'Créer session'}
          </button>
        </div>
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

      {currentSession && (
        <div className="session-card" style={{ marginBottom: '1.5rem', border: '2px solid var(--accent)', background: 'rgba(102, 126, 234, 0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1.2rem' }}>✅</span>
            <h3 style={{ margin: 0 }}>Session active</h3>
          </div>
          <h2 style={{ margin: '0.5rem 0' }}>{currentSession.title}</h2>
          <span className="category-badge">{currentSession.category}</span>
          <div style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
            {currentSession.pomodoros || 0} pomodoros complétés
          </div>
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
            const isEditing = editingId === session.id
            
            return (
              <div key={session.id} className="session-card">
                {isEditing ? (
                  <div className="edit-mode">
                    <input 
                      type="text" 
                      className="input-field"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && saveEdit(session.id)}
                    />
                    <div className="edit-buttons">
                      <button className="btn btn-success btn-small" onClick={() => saveEdit(session.id)}>
                        Enregistrer
                      </button>
                      <button className="btn btn-secondary btn-small" onClick={cancelEditing}>
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3>{session.title}</h3>
                    <span className="category-badge">{session.category}</span>
                    <div className="session-time">Temps total: {hours}h {minutes}m</div>
                    <div className="session-pomodoros">🍅 {session.pomodoros} pomodoros</div>
                    <div className="session-actions">
                      {currentSession?.id !== session.id && (
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
                        Renommer
                      </button>
                      <button 
                        className="btn btn-danger btn-small" 
                        onClick={() => deleteSession(session.id)}
                      >
                        Supprimer
                      </button>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
