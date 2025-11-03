import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Analytics } from "@vercel/analytics/react";
import { HexColorPicker } from "react-colorful";
import { onAuthChange, signOut, deleteUserAccount, resendVerificationEmail } from "./firebase/auth";
import {
  getSettings,
  saveSettings,
  onSessionsChange,
  onPomodorosChange,
  migrateLocalStorageData,
  getSessions,
  getPomodoros,
  deleteAllUserData,
} from "./firebase/database";
import Timer from "./components/Timer";
import Sessions from "./components/Sessions";
import Calendar from "./components/Calendar";
import Login from "./components/Login";
import "./App.css";

// Fonction pour calculer les statistiques
function calculateStats(pomodoros) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const todayPomodoros = pomodoros.filter((p) => new Date(p.date) >= today);
  const weekPomodoros = pomodoros.filter((p) => new Date(p.date) >= weekAgo);
  const monthPomodoros = pomodoros.filter(
    (p) => new Date(p.date) >= monthStart
  );

  return {
    today: todayPomodoros.length,
    week: weekPomodoros.length,
    month: monthPomodoros.length,
    todayMinutes: Math.round(
      todayPomodoros.reduce((sum, p) => sum + p.duration, 0) / 60
    ),
    weekMinutes: Math.round(
      weekPomodoros.reduce((sum, p) => sum + p.duration, 0) / 60
    ),
    monthMinutes: Math.round(
      monthPomodoros.reduce((sum, p) => sum + p.duration, 0) / 60
    ),
    total: pomodoros.length,
  };
}

// Fonction pour préparer les données pour les graphiques
function prepareChartData(pomodoros) {
  const now = new Date();
  const last7Days = [];

  // Données des 7 derniers jours
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const dayPomodoros = pomodoros.filter((p) => {
      const pDate = new Date(p.date);
      return pDate.toDateString() === date.toDateString();
    });

    const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
    const minutes = Math.round(
      dayPomodoros.reduce((sum, p) => sum + p.duration, 0) / 60
    );

    last7Days.push({
      name: dayNames[date.getDay()],
      pomodoros: dayPomodoros.length,
      minutes: minutes,
      heures: (minutes / 60).toFixed(1),
    });
  }

  // Données par catégorie
  const categoryData = {};
  pomodoros.forEach((p) => {
    if (!categoryData[p.category]) {
      categoryData[p.category] = { count: 0, time: 0 };
    }
    categoryData[p.category].count++;
    categoryData[p.category].time += p.duration;
  });

  const categoryChart = Object.entries(categoryData).map(([name, data]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value: data.count,
    minutes: Math.round(data.time / 60),
  }));

  return { last7Days, categoryChart };
}

// Générer des variations de couleur pour les graphiques camembert
function generateColorVariations(baseColor, count) {
  const colors = [];
  const r = parseInt(baseColor.slice(1, 3), 16);
  const g = parseInt(baseColor.slice(3, 5), 16);
  const b = parseInt(baseColor.slice(5, 7), 16);

  for (let i = 0; i < count; i++) {
    const factor = 0.6 + (i / count) * 0.7; // Variation de 60% à 130%
    const newR = Math.min(255, Math.round(r * factor));
    const newG = Math.min(255, Math.round(g * factor));
    const newB = Math.min(255, Math.round(b * factor));
    colors.push(`rgb(${newR}, ${newG}, ${newB})`);
  }
  
  return colors;
}

// Générer une couleur plus claire pour la deuxième ligne du graphique
function generateLighterColor(baseColor) {
  const r = parseInt(baseColor.slice(1, 3), 16);
  const g = parseInt(baseColor.slice(3, 5), 16);
  const b = parseInt(baseColor.slice(5, 7), 16);
  
  // Augmenter la luminosité de 40%
  const lighten = (val) => Math.min(255, Math.round(val + (255 - val) * 0.4));
  
  return `rgb(${lighten(r)}, ${lighten(g)}, ${lighten(b)})`;
}

const PRESET_COLORS = [
  { name: "Rouge", color: "#ff6b6b" },
  { name: "Violet", color: "#667eea" },
  { name: "Vert", color: "#51cf66" },
  { name: "Bleu", color: "#4facfe" },
];

function generateThemeFromColor(color) {
  // Fonction pour assombrir légèrement la couleur pour le hover
  const darkenColor = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const factor = 0.85;
    return `#${Math.round(r * factor)
      .toString(16)
      .padStart(2, "0")}${Math.round(g * factor)
      .toString(16)
      .padStart(2, "0")}${Math.round(b * factor)
      .toString(16)
      .padStart(2, "0")}`;
  };

  return {
    accent: color,
    accentHover: darkenColor(color),
    gradient1: color,
    gradient2: darkenColor(color),
  };
}

// Email Verification Screen Component
function EmailVerificationScreen({ user }) {
  const [countdown, setCountdown] = useState(60)
  const [canResend, setCanResend] = useState(false)
  const [resending, setResending] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else {
      setCanResend(true)
    }
  }, [countdown])

  // Vérifier périodiquement si l'email a été vérifié
  useEffect(() => {
    const checkVerification = setInterval(async () => {
      await user.reload()
      if (user.emailVerified) {
        window.location.reload()
      }
    }, 3000)

    return () => clearInterval(checkVerification)
  }, [user])

  const handleResendEmail = async () => {
    try {
      setResending(true)
      setMessage('')
      await resendVerificationEmail()
      setMessage('✅ Email renvoyé avec succès !')
      setCountdown(60)
      setCanResend(false)
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      setMessage('❌ Erreur lors de l\'envoi de l\'email')
    } finally {
      setResending(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    window.location.reload()
  }

  return (
    <div className="login-container">
      <div className="login-card" style={{ maxWidth: '500px' }}>
        <div className="login-header">
          <picture>
            <source srcSet="/tomato.webp" type="image/webp" />
            <img 
              src="/tomato.png" 
              alt="Logo Tomodoro" 
              className="login-logo"
              loading="eager"
              width="140"
              height="140"
            />
          </picture>
          <h1>Vérifiez votre email</h1>
        </div>

        <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
          <div className="login-error" style={{ marginBottom: '1.5rem' }}>
            ⚠️ Veuillez confirmer votre email. Un mail vous a été envoyé.
          </div>

          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
            Nous avons envoyé un email de vérification à :<br />
            <strong style={{ color: 'var(--text-primary)' }}>{user.email}</strong>
          </p>

          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Cliquez sur le lien dans l'email pour activer votre compte.<br />
            <em>Cette page se mettra à jour automatiquement.</em>
          </p>

          <button 
            className="btn btn-primary"
            onClick={handleResendEmail}
            disabled={!canResend || resending}
            style={{ 
              marginBottom: '1rem',
              opacity: canResend ? 1 : 0.5,
              cursor: canResend ? 'pointer' : 'not-allowed'
            }}
          >
            {resending ? 'Envoi...' : canResend ? 'Renvoyer l\'email' : `Renvoyer dans ${countdown}s`}
          </button>

          {message && (
            <div style={{ 
              padding: '0.75rem', 
              borderRadius: '8px', 
              marginBottom: '1rem',
              background: message.includes('✅') ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
              color: message.includes('✅') ? '#4caf50' : '#f44336'
            }}>
              {message}
            </div>
          )}

          <button 
            className="btn btn-secondary"
            onClick={handleSignOut}
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  )
}

function App() {
  // Auth state
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [currentView, setCurrentView] = useState("timer"); // 'timer', 'sessions', 'calendar', 'stats', 'settings'
  const [activeTab, setActiveTab] = useState("activite");
  const [data, setData] = useState({ sessions: [], pomodoros: [] });
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState({
    last7Days: [],
    categoryChart: [],
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [customColor, setCustomColor] = useState("#ff6b6b");
  const [timerSettings, setTimerSettings] = useState({
    focusTime: 35,
    breakTime: 8,
    longBreakTime: 20,
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const [pendingChanges, setPendingChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const currentTheme = generateThemeFromColor(customColor);
  const chartColors = generateColorVariations(customColor, 7);
  const lighterColor = generateLighterColor(customColor);

  const refreshData = () => {
    // Data is now loaded from Firebase automatically via listeners
    setRefreshKey((prev) => prev + 1);
  };

  const changeColor = (newColor) => {
    setCustomColor(newColor);
    setPendingChanges(true);
  };

  const updateTimerSettings = (newSettings) => {
    setTimerSettings(newSettings);
    setPendingChanges(true);
  };

  const saveAllSettings = async () => {
    if (user) {
      try {
        // Valider et corriger les valeurs vides ou invalides
        const validatedSettings = {
          focusTime: timerSettings.focusTime || 1,
          breakTime: timerSettings.breakTime || 1,
          longBreakTime: timerSettings.longBreakTime || 1
        };
        
        setTimerSettings(validatedSettings);
        await saveSettings(user.uid, { customColor, timerSettings: validatedSettings });
        setPendingChanges(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error);
        alert('Erreur lors de la sauvegarde des paramètres');
      }
    }
  };

  const handleResetData = async () => {
    if (confirmText !== 'confirmer') {
      alert('Veuillez taper "confirmer" pour valider');
      return;
    }

    try {
      await deleteAllUserData(user.uid);
      setShowResetModal(false);
      setConfirmText('');
      alert('✅ Toutes les données ont été supprimées');
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('❌ Erreur lors de la suppression des données');
    }
  };

  const handleDeleteAccount = async () => {
    if (confirmText !== 'confirmer') {
      alert('Veuillez taper "confirmer" pour valider');
      return;
    }

    try {
      await deleteAllUserData(user.uid);
      await deleteUserAccount();
      setShowDeleteModal(false);
      setConfirmText('');
    } catch (error) {
      console.error('Erreur lors de la suppression du compte:', error);
      if (error.code === 'auth/requires-recent-login') {
        alert('❌ Vous devez vous reconnecter avant de supprimer votre compte. Veuillez vous déconnecter puis vous reconnecter.');
      } else {
        alert('❌ Erreur lors de la suppression du compte');
      }
    }
  };

  // Apply theme colors to CSS variables
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--accent", currentTheme.accent);
    root.style.setProperty("--accent-hover", currentTheme.accentHover);
    root.style.setProperty("--gradient1", currentTheme.gradient1);
    root.style.setProperty("--gradient2", currentTheme.gradient2);
  }, [customColor, currentTheme]);

  // Ouvrir/fermer le sidebar au hover
  useEffect(() => {
    const handleMouseMove = (e) => {
      const sidebar = document.querySelector(".sidebar");
      
      // Ouvrir si la souris est dans les 50 premiers pixels à gauche
      if (e.clientX <= 50 && !sidebarOpen) {
        setSidebarOpen(true);
      }
      
      // Fermer si le menu est ouvert et la souris quitte la zone (sidebar + marge)
      if (sidebar && sidebarOpen) {
        const sidebarRect = sidebar.getBoundingClientRect();
        const isOutside = e.clientX > sidebarRect.right + 50; // 50px de marge
        
        if (isOutside) {
          setSidebarOpen(false);
        }
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    return () => document.removeEventListener("mousemove", handleMouseMove);
  }, [sidebarOpen]);

  // Gestion du swipe sur mobile
  useEffect(() => {
    let touchStartX = 0;
    let touchEndX = 0;
    let touchStartY = 0;
    let touchEndY = 0;

    const handleTouchStart = (e) => {
      // Ignorer si on touche dans une zone de contenu (pas le bord)
      const target = e.target;
      if (target.closest('.sessions-grid') || target.closest('.calendar-grid') || target.closest('.session-card')) {
        return;
      }
      
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    };

    const handleTouchEnd = (e) => {
      // Ignorer si pas de touchStart (déjà bloqué)
      if (touchStartX === 0 && touchStartY === 0) return;
      
      touchEndX = e.changedTouches[0].screenX;
      touchEndY = e.changedTouches[0].screenY;
      handleSwipe();
      
      // Réinitialiser
      touchStartX = 0;
      touchStartY = 0;
    };

    const handleSwipe = () => {
      const swipeDistanceX = touchEndX - touchStartX;
      const swipeDistanceY = Math.abs(touchEndY - touchStartY);
      const sidebar = document.querySelector(".sidebar");
      
      // Vérifier que c'est un swipe horizontal (pas vertical)
      if (swipeDistanceY > 50) return;
      
      // Swipe droite depuis le bord gauche -> ouvrir
      if (touchStartX < 50 && swipeDistanceX > 100 && !sidebarOpen) {
        setSidebarOpen(true);
      }
      
      // Swipe gauche depuis la sidebar -> fermer
      if (sidebar && sidebarOpen && swipeDistanceX < -100) {
        const sidebarRect = sidebar.getBoundingClientRect();
        if (touchStartX < sidebarRect.right) {
          setSidebarOpen(false);
        }
      }
    };

    document.addEventListener("touchstart", handleTouchStart);
    document.addEventListener("touchend", handleTouchEnd);

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [sidebarOpen]);

  // Fermer le sidebar quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (e) => {
      const sidebar = document.querySelector(".sidebar");
      const hamburger = document.querySelector(".hamburger-menu");

      if (
        sidebar &&
        !sidebar.contains(e.target) &&
        !hamburger.contains(e.target) &&
        sidebarOpen
      ) {
        setSidebarOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [sidebarOpen]);

  // Auth listener
  useEffect(() => {
    //console.log('🔥 Setting up auth listener...')

    const unsubscribe = onAuthChange(async (currentUser) => {
      //console.log('👤 Auth state changed:', currentUser ? currentUser.email : 'No user')

      setUser(currentUser);

      if (currentUser) {
        // User is logged in
        try {
          // Load user settings from Firebase
          const userSettings = await getSettings(currentUser.uid);
          if (userSettings) {
            if (userSettings.customColor) {
              setCustomColor(userSettings.customColor);
            }
            if (userSettings.timerSettings) {
              setTimerSettings(userSettings.timerSettings);
            }
          }

          // Load initial data from Firebase
          //console.log('🔍 Loading data for user:', currentUser.uid)
          const [initialSessions, initialPomodoros] = await Promise.all([
            getSessions(currentUser.uid),
            getPomodoros(currentUser.uid),
          ]);

          //console.log('📦 Loaded sessions:', initialSessions.length, initialSessions) .suppression log 
          //console.log('🍅 Loaded pomodoros:', initialPomodoros.length, initialPomodoros)

          setData({ sessions: initialSessions, pomodoros: initialPomodoros });
          setStats(calculateStats(initialPomodoros));
          setChartData(prepareChartData(initialPomodoros));

          // Setup real-time listeners for sessions and pomodoros
          const unsubSessions = onSessionsChange(
            currentUser.uid,
            (sessions) => {
              //console.log('🔄 Sessions updated:', sessions.length)
              setData((prev) => ({ ...prev, sessions }));
            }
          );

          const unsubPomodoros = onPomodorosChange(
            currentUser.uid,
            (pomodoros) => {
              //console.log('🔄 Pomodoros updated:', pomodoros.length)
              setData((prev) => ({ ...prev, pomodoros }));
              setStats(calculateStats(pomodoros));
              setChartData(prepareChartData(pomodoros));
            }
          );

          // Request notification permission
          if (
            "Notification" in window &&
            Notification.permission === "default"
          ) {
            Notification.requestPermission();
          }

          // Cleanup listeners when user logs out
          return () => {
            unsubSessions();
            unsubPomodoros();
          };
        } catch (error) {
          //console.error('❌ Error loading user data:', error)
        }
      } else {
        // User is logged out - clear data
        //console.log('🚪 User logged out, clearing data')
        setData({ sessions: [], pomodoros: [] });
        setStats(null);
        setChartData({ last7Days: [], categoryChart: [] });
      }
    });

    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show loading screen while checking auth
  if (authLoading) {
    return (
      <div className="loading-screen">
        <h1>🍅 Pomodoro</h1>
        <p>Chargement...</p>
      </div>
    );
  }

  // Show login if not authenticated
  if (!user) {
    return <Login />;
  }

  // Show email verification screen if email not verified
  if (user && !user.emailVerified) {
    return <EmailVerificationScreen user={user} />;
  }

  const hasData = data.pomodoros.length > 0;

  return (
    <div className="app-container">
      <button
        className={`hamburger-menu ${sidebarOpen ? 'hidden' : ''}`}
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Ouvrir le menu de navigation"
        aria-expanded={sidebarOpen}
      >
        <div className="hamburger-line"></div>
        <div className="hamburger-line"></div>
        <div className="hamburger-line"></div>
      </button>

      <nav className={`sidebar ${sidebarOpen ? "open" : ""}`} role="navigation" aria-label="Menu principal">
        <h1>🍅 Pomodoro</h1>
        <ul>
          <li>
            <a
              href="#timer"
              className={
                currentView === "timer" ? "nav-link active" : "nav-link"
              }
              onClick={(e) => {
                e.preventDefault();
                setCurrentView("timer");
                setSidebarOpen(false);
              }}
            >
              Timer
            </a>
          </li>
          <li>
            <a
              href="#sessions"
              className={
                currentView === "sessions" ? "nav-link active" : "nav-link"
              }
              onClick={(e) => {
                e.preventDefault();
                setCurrentView("sessions");
                setSidebarOpen(false);
              }}
            >
              Sessions
            </a>
          </li>
          <li>
            <a
              href="#calendar"
              className={
                currentView === "calendar" ? "nav-link active" : "nav-link"
              }
              onClick={(e) => {
                e.preventDefault();
                setCurrentView("calendar");
                setSidebarOpen(false);
              }}
            >
              Calendrier
            </a>
          </li>
          <li>
            <a
              href="#stats"
              className={
                currentView === "stats" ? "nav-link active" : "nav-link"
              }
              onClick={(e) => {
                e.preventDefault();
                setCurrentView("stats");
                setSidebarOpen(false);
              }}
            >
              Statistiques
            </a>
          </li>
          <li>
            <a
              href="#settings"
              className={
                currentView === "settings" ? "nav-link active" : "nav-link"
              }
              onClick={(e) => {
                e.preventDefault();
                setCurrentView("settings");
                setSidebarOpen(false);
              }}
            >
              Paramètres
            </a>
          </li>
        </ul>

        <a 
          href="https://github.com/Th3drata/Tomodoro" 
          target="_blank" 
          rel="noopener noreferrer"
          className="github-link"
          title="Voir le code sur GitHub"
          aria-label="Voir le code source du projet sur GitHub"
        >
          <svg height="24" width="24" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
          </svg>
          GitHub
        </a>

        {user && (
          <div className="user-info">
            <img
              src={user.photoURL}
              alt={user.displayName}
              className="user-avatar"
            />
            <span className="user-name">{user.displayName}</span>
            <button onClick={signOut} className="btn btn-secondary btn-small" aria-label="Se déconnecter du compte">
              Déconnexion
            </button>
          </div>
        )}
      </nav>

      <main className="content" role="main">
        {currentView === "timer" && (
          <Timer
            onPomodoroComplete={refreshData}
            settings={timerSettings}
            currentSession={currentSession}
            setCurrentSession={setCurrentSession}
          />
        )}

        {currentView === "sessions" && (
          <Sessions
            sessions={data.sessions}
            key={refreshKey}
            currentSession={currentSession}
            setCurrentSession={setCurrentSession}
            onNavigateToTimer={() => setCurrentView("timer")}
          />
        )}

        {currentView === "calendar" && <Calendar key={refreshKey} />}

        {currentView === "settings" && (
          <div className="settings-section">
            <h2>Paramètres</h2>

            <div className="settings-card">
              <h3>Couleur du thème</h3>
              <p className="settings-description">
                Choisissez une couleur prédéfinie ou personnalisez avec la roue
              </p>

              <div className="color-presets">
                {PRESET_COLORS.map((preset) => (
                  <button
                    key={preset.name}
                    className={`color-preset ${
                      customColor === preset.color ? "active" : ""
                    }`}
                    onClick={() => changeColor(preset.color)}
                    style={{ background: preset.color }}
                    title={preset.name}
                  >
                    {customColor === preset.color && (
                      <span className="preset-check">✓</span>
                    )}
                  </button>
                ))}
              </div>

              <div className="color-picker-section">
                <h4>Couleur personnalisée</h4>
                <div className="color-picker-wrapper">
                  <HexColorPicker color={customColor} onChange={changeColor} />
                  <div className="color-input-wrapper">
                    <input
                      type="text"
                      value={customColor}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                          changeColor(val);
                        }
                      }}
                      className="input-field color-input"
                      placeholder="#ff6b6b"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="settings-card" style={{ marginTop: "2rem" }}>
              <h3>Durées du timer</h3>
              <p className="settings-description">
                Personnalisez les durées de travail et de pause (en minutes)
              </p>
              <div className="timer-settings">
                <div className="setting-item">
                  <label htmlFor="focusTime">Temps de concentration</label>
                  <input
                    id="focusTime"
                    type="number"
                    max="120"
                    value={timerSettings.focusTime}
                    onChange={(e) =>
                      updateTimerSettings({
                        ...timerSettings,
                        focusTime: e.target.value === '' ? '' : parseInt(e.target.value),
                      })
                    }
                    className="input-field"
                    placeholder="1"
                  />
                </div>
                <div className="setting-item">
                  <label htmlFor="breakTime">Pause courte</label>
                  <input
                    id="breakTime"
                    type="number"
                    max="60"
                    value={timerSettings.breakTime}
                    onChange={(e) =>
                      updateTimerSettings({
                        ...timerSettings,
                        breakTime: e.target.value === '' ? '' : parseInt(e.target.value),
                      })
                    }
                    className="input-field"
                    placeholder="1"
                  />
                </div>
                <div className="setting-item">
                  <label htmlFor="longBreakTime">Pause longue</label>
                  <input
                    id="longBreakTime"
                    type="number"
                    max="120"
                    value={timerSettings.longBreakTime}
                    onChange={(e) =>
                      updateTimerSettings({
                        ...timerSettings,
                        longBreakTime: e.target.value === '' ? '' : parseInt(e.target.value),
                      })
                    }
                    className="input-field"
                    placeholder="1"
                  />
                </div>
              </div>
            </div>

            {/* Bouton Enregistrer */}
            <div style={{ 
              position: 'sticky', 
              bottom: '2rem', 
              marginTop: '2rem',
              display: 'flex',
              justifyContent: 'center',
              gap: '1rem',
              alignItems: 'center',
              flexWrap: 'wrap'
            }}>
              <button 
                onClick={saveAllSettings}
                disabled={!pendingChanges}
                className="btn btn-primary btn-save-settings"
                style={{ 
                  minWidth: '200px',
                  opacity: pendingChanges ? 1 : 0.5,
                  cursor: pendingChanges ? 'pointer' : 'not-allowed'
                }}
              >
                {pendingChanges ? '💾 Enregistrer' : '✓ Sauvegardé'}
              </button>
              {saveSuccess && (
                <span style={{ 
                  color: 'var(--success)', 
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  animation: 'fadeIn 0.3s ease'
                }}>
                  ✓ Enregistré !
                </span>
              )}
            </div>

            {/* Zone de danger */}
            <div className="settings-card" style={{ marginTop: '2rem', borderColor: '#ff6b6b' }}>
              <h3 style={{ color: '#ff6b6b' }}>Zone de danger</h3>
              <p className="settings-description">
                Actions irréversibles. Soyez prudent.
              </p>
              
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
                <button 
                  className="btn btn-danger"
                  onClick={() => setShowResetModal(true)}
                  style={{ flex: '1 1 200px' }}
                >
                  🗑️ Réinitialiser les données
                </button>
                <button 
                  className="btn btn-danger"
                  onClick={() => setShowDeleteModal(true)}
                  style={{ flex: '1 1 200px' }}
                >
                  ⚠️ Supprimer mon compte
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modale Reset */}
        {showResetModal && (
          <div className="modal-overlay" onClick={() => { setShowResetModal(false); setConfirmText(''); }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
              <div className="modal-header">
                <h3>🗑️ Réinitialiser les données</h3>
                <button className="modal-close" onClick={() => { setShowResetModal(false); setConfirmText(''); }}>×</button>
              </div>
              <div className="modal-body">
                <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                  Cette action supprimera <strong>toutes vos sessions, pomodoros et paramètres</strong>.
                </p>
                <p style={{ marginBottom: '1.5rem', color: '#ff6b6b', fontWeight: 600 }}>
                  ⚠️ Cette action est irréversible !
                </p>
                
                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>
                  Tapez <strong>confirmer</strong> pour valider :
                </label>
                <input 
                  type="text" 
                  className="input-field"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="confirmer"
                  style={{ marginBottom: '1.5rem' }}
                />

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => { setShowResetModal(false); setConfirmText(''); }}
                  >
                    Annuler
                  </button>
                  <button 
                    className="btn btn-danger" 
                    onClick={handleResetData}
                    disabled={confirmText !== 'confirmer'}
                    style={{ opacity: confirmText === 'confirmer' ? 1 : 0.5 }}
                  >
                    Réinitialiser
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modale Suppression compte */}
        {showDeleteModal && (
          <div className="modal-overlay" onClick={() => { setShowDeleteModal(false); setConfirmText(''); }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
              <div className="modal-header">
                <h3>⚠️ Supprimer mon compte</h3>
                <button className="modal-close" onClick={() => { setShowDeleteModal(false); setConfirmText(''); }}>×</button>
              </div>
              <div className="modal-body">
                <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                  Cette action supprimera <strong>définitivement votre compte</strong> ainsi que toutes vos données.
                </p>
                <p style={{ marginBottom: '1.5rem', color: '#ff6b6b', fontWeight: 600 }}>
                  ⚠️ Vous ne pourrez plus vous reconnecter avec ce compte !
                </p>
                
                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>
                  Tapez <strong>confirmer</strong> pour valider :
                </label>
                <input 
                  type="text" 
                  className="input-field"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="confirmer"
                  style={{ marginBottom: '1.5rem' }}
                />

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => { setShowDeleteModal(false); setConfirmText(''); }}
                  >
                    Annuler
                  </button>
                  <button 
                    className="btn btn-danger" 
                    onClick={handleDeleteAccount}
                    disabled={confirmText !== 'confirmer'}
                    style={{ opacity: confirmText === 'confirmer' ? 1 : 0.5 }}
                  >
                    Supprimer définitivement
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentView === "stats" && (
          <div className="dashboard">
            <header className="header">
              <h1>📊 Statistiques</h1>
              <p>Visualisez vos statistiques de productivité</p>
            </header>

            <div className="stats-grid" style={{ marginBottom: "2rem" }}>
              <div className="stat-card">
                <h3>Aujourd'hui</h3>
                <p className="stat-value">{stats.today} 🍅</p>
                <span className="stat-detail">
                  {stats.todayMinutes} minutes
                </span>
              </div>
              <div className="stat-card">
                <h3>Cette Semaine</h3>
                <p className="stat-value">{stats.week} 🍅</p>
                <span className="stat-detail">
                  {Math.round(stats.weekMinutes / 60)}h {stats.weekMinutes % 60}
                  m
                </span>
              </div>
              <div className="stat-card">
                <h3>Ce Mois</h3>
                <p className="stat-value">{stats.month} 🍅</p>
                <span className="stat-detail">
                  {Math.round(stats.monthMinutes / 60)}h{" "}
                  {stats.monthMinutes % 60}m
                </span>
              </div>
              <div className="stat-card">
                <h3>Total</h3>
                <p className="stat-value">{stats.total}</p>
                <span className="stat-detail">Pomodoros</span>
              </div>
            </div>

            <div className="tabs">
              <button
                className={activeTab === "activite" ? "active" : ""}
                onClick={() => setActiveTab("activite")}
              >
                Activité (7j)
              </button>
              <button
                className={activeTab === "categories" ? "active" : ""}
                onClick={() => setActiveTab("categories")}
              >
                Catégories
              </button>
              <button
                className={activeTab === "progression" ? "active" : ""}
                onClick={() => setActiveTab("progression")}
              >
                Progression
              </button>
            </div>

            <div className="chart-container">
              {!hasData ? (
                <div className="no-data">
                  <p>📊 Pas encore de données</p>
                  <p
                    style={{
                      fontSize: "0.9rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Commencez à utiliser le timer Pomodoro pour voir vos
                    statistiques ici!
                  </p>
                </div>
              ) : (
                <>
                  {activeTab === "activite" && (
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={chartData.last7Days}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(255,255,255,0.1)"
                        />
                        <XAxis dataKey="name" stroke="#888" />
                        <YAxis stroke="#888" />
                        <Tooltip
                          contentStyle={{
                            background: "#1a1a2e",
                            border: `1px solid ${customColor}`,
                            borderRadius: "8px",
                          }}
                          labelStyle={{ color: "#fff" }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="pomodoros"
                          name="Pomodoros"
                          stroke={customColor}
                          strokeWidth={3}
                          dot={{ fill: customColor, r: 5 }}
                          activeDot={{ r: 8 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="heures"
                          name="Heures"
                          stroke={lighterColor}
                          strokeWidth={3}
                          dot={{ fill: lighterColor, r: 5 }}
                          activeDot={{ r: 8 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}

                  {activeTab === "categories" && (
                    <ResponsiveContainer width="100%" height={400}>
                      <PieChart>
                        <Pie
                          data={chartData.categoryChart}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) =>
                            `${name}: ${(percent * 100).toFixed(0)}%`
                          }
                          outerRadius={120}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {chartData.categoryChart.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={chartColors[index % chartColors.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: "#1a1a2e",
                            border: `1px solid ${customColor}`,
                            borderRadius: "8px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}

                  {activeTab === "progression" && (
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={chartData.last7Days}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(255,255,255,0.1)"
                        />
                        <XAxis dataKey="name" stroke="#888" />
                        <YAxis stroke="#888" />
                        <Tooltip
                          contentStyle={{
                            background: "#1a1a2e",
                            border: `1px solid ${customColor}`,
                            borderRadius: "8px",
                          }}
                        />
                        <Legend />
                        <Bar
                          dataKey="minutes"
                          name="Minutes"
                          fill="url(#colorGradient)"
                          radius={[8, 8, 0, 0]}
                        />
                        <defs>
                          <linearGradient
                            id="colorGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor={customColor}
                              stopOpacity={0.8}
                            />
                            <stop
                              offset="95%"
                              stopColor={chartColors[3]}
                              stopOpacity={0.8}
                            />
                          </linearGradient>
                        </defs>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </>
              )}
            </div>

            {hasData && chartData.categoryChart.length > 0 && (
              <div className="category-breakdown">
                <h3 style={{ marginBottom: "1rem", color: "#888" }}>
                  Détail par Catégorie
                </h3>
                <div className="category-list">
                  {chartData.categoryChart.map((cat, index) => (
                    <div key={cat.name} className="category-item">
                      <div className="category-info">
                        <span
                          className="category-color"
                          style={{ background: chartColors[index % chartColors.length] }}
                        />
                        <span className="category-name">{cat.name}</span>
                      </div>
                      <div className="category-stats">
                        <span className="category-count">{cat.value} 🍅</span>
                        <span className="category-time">
                          {Math.round(cat.minutes / 60)}h {cat.minutes % 60}m
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
      <Analytics />
    </div>
  );
}

export default App;
