import { useState } from 'react'
import { signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword, signOut } from '../firebase/auth'

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [isSignUp, setIsSignUp] = useState(false)
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [particles, setParticles] = useState([])
  const [isLogoClicked, setIsLogoClicked] = useState(false)

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)
      setError(null)
      await signInWithGoogle()
    } catch (error) {
      setError('Erreur lors de la connexion. Réessayez.')
      
    } finally {
      setLoading(false)
    }
  }


  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleEmailAuth = async (e) => {
    e.preventDefault()
    
    // Validation de l'email
    if (!email || !validateEmail(email)) {
      setError('Veuillez entrer un email valide')
      return
    }

    // Validation du mot de passe
    if (!password) {
      setError('Veuillez entrer un mot de passe')
      return
    }

    // Vérification confirmation mot de passe
    if (isSignUp && password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }
    
    try {
      setLoading(true)
      setError(null)
      if (isSignUp) {
        await signUpWithEmail(email, password)
        setSuccess('✉️ Un email de vérification a été envoyé ! Vérifiez votre boîte mail avant de vous connecter.')
        // Revenir au mode connexion après inscription
        setTimeout(() => {
          setIsSignUp(false)
          setPassword('')
          setConfirmPassword('')
          setSuccess(null)
        }, 5000)
        return
      } else {
        await signInWithEmail(email, password)
        // La vérification de l'email sera gérée par App.jsx
      }
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        setError('Cet email est déjà utilisé')
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        setError('Email ou mot de passe incorrect')
      } else if (error.code === 'auth/weak-password') {
        setError('Le mot de passe doit contenir au moins 6 caractères')
      } else if (error.code === 'auth/too-many-requests') {
        setError('⚠️ Trop de tentatives. Réessayez dans quelques minutes.')
      } else if (error.code === 'auth/network-request-failed') {
        setError('Erreur de connexion. Vérifiez votre réseau.')
      } else {
        setError('Erreur lors de la connexion')
      }
      
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    
    if (!email || !validateEmail(email)) {
      setError('Veuillez entrer un email valide')
      return
    }
    
    try {
      setLoading(true)
      setError(null)
      setSuccess(null)
      await resetPassword(email)
      setSuccess('Email de réinitialisation envoyé ! Vérifiez votre boîte mail.')
      setTimeout(() => {
        setShowResetPassword(false)
        setSuccess(null)
      }, 3000)
    } catch (error) {
      // Ne pas révéler si l'email existe ou non pour des raisons de sécurité
      if (error.code === 'auth/too-many-requests') {
        setError('⚠️ Trop de tentatives. Réessayez dans quelques minutes.')
      } else {
        setSuccess('Si cet email existe, un lien de réinitialisation a été envoyé.')
        setTimeout(() => {
          setShowResetPassword(false)
          setSuccess(null)
        }, 3000)
      }
      
    } finally {
      setLoading(false)
    }
  }

  const handleLogoClick = () => {
    // Effet d'agrandissement
    setIsLogoClicked(true)
    setTimeout(() => setIsLogoClicked(false), 300)

    // Créer des particules
    const newParticles = []
    for (let i = 0; i < 12; i++) {
      newParticles.push({
        id: Date.now() + i,
        left: 50,
        top: 50,
        angle: (360 / 12) * i
      })
    }
    setParticles(newParticles)

    // Supprimer les particules après l'animation
    setTimeout(() => setParticles([]), 1000)
  }

  return (
    <div className="login-container">
      <div className="login-card">
        {!showEmailForm ? (
          <>
            <div className="login-header">
              <div className="logo-wrapper">
                <picture>
                  <source srcSet="/tomato.webp" type="image/webp" />
                  <img 
                    src="/tomato.png" 
                    alt="Logo Tomodoro - Tomate rouge" 
                    className={`login-logo ${isLogoClicked ? 'clicked' : ''}`}
                    onClick={handleLogoClick}
                    loading="eager"
                    width="140"
                    height="140"
                  />
                </picture>
                {particles.map(particle => (
                  <div
                    key={particle.id}
                    className="particle"
                    style={{
                      left: `${particle.left}%`,
                      top: `${particle.top}%`,
                      '--angle': `${particle.angle}deg`
                    }}
                  />
                ))}
              </div>
              <h1>Tomodoro</h1>
              <p>Concentrez-vous. Progressez. Réussissez.</p>
            </div>

            <div className="login-methods">
              <button 
                className="btn-google" 
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <svg width="20" height="20" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  <path fill="none" d="M0 0h48v48H0z"/>
                </svg>
                <span>{loading ? 'Connexion...' : 'Google'}</span>
              </button>

              <div className="login-divider">
                <span>ou</span>
              </div>

              <button 
                className="btn-email-start" 
                onClick={() => setShowEmailForm(true)}
                disabled={loading}
              >
                <span className="email-icon">📩</span>
                <span>Email & Mot de passe</span>
              </button>
            </div>
          </>
        ) : showResetPassword ? (
          <>
            <form onSubmit={handleResetPassword} className="email-form">
              <p className="reset-text">Entrez votre email pour recevoir un lien de réinitialisation</p>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value.trim())}
                className="input-field"
                disabled={loading}
                autoComplete="email"
                spellCheck="false"
              />
              <button type="submit" className="btn-email" disabled={loading}>
                {loading ? 'Envoi...' : 'Envoyer le lien'}
              </button>
            </form>

            <button 
              className="btn-back" 
              onClick={() => { setShowResetPassword(false); setError(null); setSuccess(null) }}
              disabled={loading}
            >
              ← Retour
            </button>
          </>
        ) : (
          <>
            <form onSubmit={handleEmailAuth} className="email-form">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value.trim())}
                className="input-field"
                disabled={loading}
                autoComplete="email"
                spellCheck="false"
              />
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder={isSignUp ? "Mot de passe (min 6 caractères)" : "Mot de passe"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  disabled={loading}
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  minLength="6"
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex="-1"
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              {isSignUp && (
                <div className="password-input-wrapper">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirmer le mot de passe"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-field"
                    disabled={loading}
                    autoComplete="new-password"
                    minLength="6"
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex="-1"
                    aria-label={showConfirmPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              )}
              <button type="submit" className="btn-email" disabled={loading}>
                {loading ? 'Connexion...' : (isSignUp ? 'S\'inscrire' : 'Se connecter')}
              </button>
            </form>

            {!isSignUp && (
              <button 
                className="btn-reset-password" 
                onClick={() => { setShowResetPassword(true); setError(null) }}
                disabled={loading}
              >
                Mot de passe oublié ?
              </button>
            )}

            <button 
              className="btn-switch" 
              onClick={() => { setIsSignUp(!isSignUp); setConfirmPassword(''); setError(null) }}
              disabled={loading}
            >
              {isSignUp ? 'Déjà un compte ? Se connecter' : 'Pas de compte ? S\'inscrire'}
            </button>

            <button 
              className="btn-back" 
              onClick={() => { setShowEmailForm(false); setError(null); setConfirmPassword('') }}
              disabled={loading}
            >
              ← Retour
            </button>
          </>
        )}

        {error && <div className="login-error">{error}</div>}
        {success && <div className="login-success">{success}</div>}
      </div>
    </div>
  )
}
