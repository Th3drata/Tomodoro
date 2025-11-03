import { useState, useEffect } from 'react'

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [pomodoros, setPomodoros] = useState([])
  const [sessions, setSessions] = useState([])
  const [selectedDay, setSelectedDay] = useState(null)
  const [dayDetails, setDayDetails] = useState([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = () => {
    const pomodorosData = JSON.parse(localStorage.getItem('pomodoro_pomodoros') || '[]')
    const sessionsData = JSON.parse(localStorage.getItem('pomodoro_sessions') || '[]')
    setPomodoros(pomodorosData)
    setSessions(sessionsData)
  }

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const showDayDetails = (day) => {
    const selectedDate = new Date(year, month, day)
    const dayPomodoros = pomodoros.filter(p => {
      const pDate = new Date(p.date)
      return pDate.toDateString() === selectedDate.toDateString()
    })

    const details = dayPomodoros.map(pom => {
      const session = sessions.find(s => s.id === pom.sessionId)
      const pomDate = new Date(pom.date)
      return {
        ...pom,
        sessionName: session?.title || 'Session supprimée',
        time: pomDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      }
    }).sort((a, b) => new Date(a.date) - new Date(b.date))

    setSelectedDay(day)
    setDayDetails(details)
  }

  const closeModal = () => {
    setSelectedDay(null)
    setDayDetails([])
  }

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDayOfWeek = firstDay.getDay()

  // Get pomodoros count per day
  const pomodorosPerDay = {}
  pomodoros.forEach(pomodoro => {
    const date = new Date(pomodoro.date)
    if (date.getMonth() === month && date.getFullYear() === year) {
      const day = date.getDate()
      pomodorosPerDay[day] = (pomodorosPerDay[day] || 0) + 1
    }
  })

  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
  const today = new Date()

  return (
    <div className="calendar-section">
      <h2>Calendrier</h2>
      
      <div className="calendar-controls">
        <button onClick={prevMonth} className="btn btn-secondary">←</button>
        <h3>{monthNames[month]} {year}</h3>
        <button onClick={nextMonth} className="btn btn-secondary">→</button>
      </div>

      <div className="calendar-grid">
        {/* Day names */}
        {dayNames.map(name => (
          <div key={name} className="calendar-day-name">{name}</div>
        ))}

        {/* Empty cells before month starts */}
        {Array.from({ length: startingDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="calendar-day other-month" />
        ))}

        {/* Days of month */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const isToday = day === today.getDate() && 
                         month === today.getMonth() && 
                         year === today.getFullYear()
          const hasPomodoros = pomodorosPerDay[day] > 0

          return (
            <div 
              key={day} 
              className={`calendar-day ${isToday ? 'today' : ''} ${hasPomodoros ? 'has-pomodoros' : ''}`}
              onClick={() => hasPomodoros && showDayDetails(day)}
              style={{ cursor: hasPomodoros ? 'pointer' : 'default' }}
            >
              <div className="day-number">{day}</div>
              {hasPomodoros && (
                <div className="pomodoro-count">{pomodorosPerDay[day]}</div>
              )}
            </div>
          )
        })}
      </div>

      <div className="calendar-legend">
        <div className="legend-item">
          <span className="legend-color" style={{ background: 'var(--accent)' }} />
          <span>Pomodoros complétés</span>
        </div>
      </div>

      {selectedDay && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedDay} {monthNames[month]} {year}</h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body">
              {dayDetails.length === 0 ? (
                <p>Aucun pomodoro ce jour-là</p>
              ) : (
                <>
                  <div className="day-summary">
                    <div className="summary-item">
                      <strong>Total:</strong> {dayDetails.length} pomodoros
                    </div>
                    <div className="summary-item">
                      <strong>Durée:</strong> {Math.round(dayDetails.reduce((sum, p) => sum + p.duration, 0) / 60)} minutes
                    </div>
                  </div>
                  <div className="pomodoros-list">
                    {dayDetails.map((pom, idx) => (
                      <div key={idx} className="pomodoro-item">
                        <div className="pomodoro-time">{pom.time}</div>
                        <div className="pomodoro-info">
                          <div className="pomodoro-session">{pom.sessionName}</div>
                          <div className="pomodoro-category">
                            <span className="category-badge">{pom.category}</span>
                          </div>
                        </div>
                        <div className="pomodoro-duration">{Math.round(pom.duration / 60)} min</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
