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
import { onAuthChange, signOut } from "./firebase/auth";
import {
  getSettings,
  saveSettings,
  onSessionsChange,
  onPomodorosChange,
  migrateLocalStorageData,
  getSessions,
  getPomodoros,
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

const COLORS = [
  "#667eea",
  "#764ba2",
  "#f093fb",
  "#4facfe",
  "#43e97b",
  "#fa709a",
  "#fee140",
];

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

  const currentTheme = generateThemeFromColor(customColor);

  const refreshData = () => {
    // Data is now loaded from Firebase automatically via listeners
    setRefreshKey((prev) => prev + 1);
  };

  const changeColor = async (newColor) => {
    setCustomColor(newColor);
    if (user) {
      await saveSettings(user.uid, { customColor: newColor, timerSettings });
    }
  };

  const updateTimerSettings = async (newSettings) => {
    setTimerSettings(newSettings);
    if (user) {
      await saveSettings(user.uid, { customColor, timerSettings: newSettings });
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

  const hasData = data.pomodoros.length > 0;

  return (
    <div className="app-container">
      <div
        className="hamburger-menu"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        <div className="hamburger-line"></div>
        <div className="hamburger-line"></div>
        <div className="hamburger-line"></div>
      </div>

      <nav className={`sidebar ${sidebarOpen ? "open" : ""}`}>
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

        {user && (
          <div className="user-info">
            <img
              src={user.photoURL}
              alt={user.displayName}
              className="user-avatar"
            />
            <span className="user-name">{user.displayName}</span>
            <button onClick={signOut} className="btn btn-secondary btn-small">
              Déconnexion
            </button>
          </div>
        )}
      </nav>

      <main className="content">
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
                    min="1"
                    max="120"
                    value={timerSettings.focusTime}
                    onChange={(e) =>
                      updateTimerSettings({
                        ...timerSettings,
                        focusTime: parseInt(e.target.value) || 1,
                      })
                    }
                    className="input-field"
                  />
                </div>
                <div className="setting-item">
                  <label htmlFor="breakTime">Pause courte</label>
                  <input
                    id="breakTime"
                    type="number"
                    min="1"
                    max="60"
                    value={timerSettings.breakTime}
                    onChange={(e) =>
                      updateTimerSettings({
                        ...timerSettings,
                        breakTime: parseInt(e.target.value) || 1,
                      })
                    }
                    className="input-field"
                  />
                </div>
                <div className="setting-item">
                  <label htmlFor="longBreakTime">Pause longue</label>
                  <input
                    id="longBreakTime"
                    type="number"
                    min="1"
                    max="120"
                    value={timerSettings.longBreakTime}
                    onChange={(e) =>
                      updateTimerSettings({
                        ...timerSettings,
                        longBreakTime: parseInt(e.target.value) || 1,
                      })
                    }
                    className="input-field"
                  />
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
                            border: "1px solid #667eea",
                            borderRadius: "8px",
                          }}
                          labelStyle={{ color: "#fff" }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="pomodoros"
                          name="Pomodoros"
                          stroke="#667eea"
                          strokeWidth={3}
                          dot={{ fill: "#667eea", r: 5 }}
                          activeDot={{ r: 8 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="heures"
                          name="Heures"
                          stroke="#43e97b"
                          strokeWidth={3}
                          dot={{ fill: "#43e97b", r: 5 }}
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
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: "#1a1a2e",
                            border: "1px solid #667eea",
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
                            border: "1px solid #667eea",
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
                              stopColor="#667eea"
                              stopOpacity={0.8}
                            />
                            <stop
                              offset="95%"
                              stopColor="#764ba2"
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
                          style={{ background: COLORS[index % COLORS.length] }}
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
