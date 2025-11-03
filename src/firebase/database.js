import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot
} from 'firebase/firestore'
import { db } from './config'

// Collections
const COLLECTIONS = {
  SESSIONS: 'sessions',
  POMODOROS: 'pomodoros',
  SETTINGS: 'settings'
}

// ===== SESSIONS =====

export const getSessions = async (userId) => {
  try {
    console.log('📊 getSessions called for userId:', userId)
    const q = query(
      collection(db, COLLECTIONS.SESSIONS),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    )
    const snapshot = await getDocs(q)
    const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    console.log('📊 Found sessions:', sessions.length, sessions)
    return sessions
  } catch (error) {
    console.error('❌ Error getting sessions:', error.message, error.code)
    return []
  }
}

export const addSession = async (userId, sessionData) => {
  try {
    const sessionRef = doc(collection(db, COLLECTIONS.SESSIONS))
    await setDoc(sessionRef, {
      ...sessionData,
      userId,
      createdAt: new Date().toISOString()
    })
    return sessionRef.id
  } catch (error) {
    console.error('Error adding session:', error)
    throw error
  }
}

export const updateSession = async (sessionId, data) => {
  try {
    const sessionRef = doc(db, COLLECTIONS.SESSIONS, sessionId)
    await updateDoc(sessionRef, data)
  } catch (error) {
    console.error('Error updating session:', error)
    throw error
  }
}

export const deleteSession = async (sessionId) => {
  try {
    await deleteDoc(doc(db, COLLECTIONS.SESSIONS, sessionId))
  } catch (error) {
    console.error('Error deleting session:', error)
    throw error
  }
}

// ===== POMODOROS =====

export const getPomodoros = async (userId) => {
  try {
    console.log('🍅 getPomodoros called for userId:', userId)
    const q = query(
      collection(db, COLLECTIONS.POMODOROS),
      where('userId', '==', userId),
      orderBy('date', 'desc')
    )
    const snapshot = await getDocs(q)
    const pomodoros = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    console.log('🍅 Found pomodoros:', pomodoros.length, pomodoros)
    return pomodoros
  } catch (error) {
    console.error('❌ Error getting pomodoros:', error.message, error.code)
    return []
  }
}

export const addPomodoro = async (userId, pomodoroData) => {
  try {
    const pomodoroRef = doc(collection(db, COLLECTIONS.POMODOROS))
    await setDoc(pomodoroRef, {
      ...pomodoroData,
      userId,
      date: new Date().toISOString()
    })
    return pomodoroRef.id
  } catch (error) {
    console.error('Error adding pomodoro:', error)
    throw error
  }
}

export const deletePomodoro = async (pomodoroId) => {
  try {
    await deleteDoc(doc(db, COLLECTIONS.POMODOROS, pomodoroId))
  } catch (error) {
    console.error('Error deleting pomodoro:', error)
    throw error
  }
}

// ===== SETTINGS =====

export const getSettings = async (userId) => {
  try {
    const settingsRef = doc(db, COLLECTIONS.SETTINGS, userId)
    const snapshot = await getDoc(settingsRef)
    if (snapshot.exists()) {
      return snapshot.data()
    }
    return null
  } catch (error) {
    console.error('Error getting settings:', error)
    return null
  }
}

export const saveSettings = async (userId, settings) => {
  try {
    const settingsRef = doc(db, COLLECTIONS.SETTINGS, userId)
    await setDoc(settingsRef, settings, { merge: true })
  } catch (error) {
    console.error('Error saving settings:', error)
    throw error
  }
}

// ===== REAL-TIME LISTENERS =====

export const onSessionsChange = (userId, callback) => {
  const q = query(
    collection(db, COLLECTIONS.SESSIONS),
    where('userId', '==', userId)
  )
  return onSnapshot(q, (snapshot) => {
    const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    callback(sessions)
  })
}

export const onPomodorosChange = (userId, callback) => {
  const q = query(
    collection(db, COLLECTIONS.POMODOROS),
    where('userId', '==', userId)
  )
  return onSnapshot(q, (snapshot) => {
    const pomodoros = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    callback(pomodoros)
  })
}

// ===== MIGRATION from localStorage =====

export const migrateLocalStorageData = async (userId) => {
  try {
    // Get localStorage data
    const localSessions = JSON.parse(localStorage.getItem('pomodoro_sessions') || '[]')
    const localPomodoros = JSON.parse(localStorage.getItem('pomodoro_pomodoros') || '[]')
    const localTheme = localStorage.getItem('pomodoro_theme')
    const localTimerSettings = localStorage.getItem('pomodoro_timer_settings')

    // Migrate sessions
    for (const session of localSessions) {
      const sessionRef = doc(collection(db, COLLECTIONS.SESSIONS))
      await setDoc(sessionRef, {
        ...session,
        userId,
        id: sessionRef.id
      })
    }

    // Migrate pomodoros
    for (const pomodoro of localPomodoros) {
      const pomodoroRef = doc(collection(db, COLLECTIONS.POMODOROS))
      await setDoc(pomodoroRef, {
        ...pomodoro,
        userId,
        id: pomodoroRef.id
      })
    }

    // Migrate settings
    if (localTheme || localTimerSettings) {
      await saveSettings(userId, {
        theme: localTheme || 'red',
        timerSettings: localTimerSettings ? JSON.parse(localTimerSettings) : {
          focusTime: 35,
          breakTime: 8,
          longBreakTime: 20
        }
      })
    }

    return true
  } catch (error) {
    console.error('Error migrating data:', error)
    return false
  }
}
