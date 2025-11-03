import { 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  OAuthProvider,
  sendPasswordResetEmail,
  deleteUser,
  reauthenticateWithPopup,
  sendEmailVerification
} from 'firebase/auth'
import { auth, googleProvider } from './config'

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider)
    return result.user
  } catch (error) {
    console.error('Error signing in with Google:', error)
    throw error
  }
}

// Sign up with Email/Password
export const signUpWithEmail = async (email, password) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password)
    // Envoyer email de vérification
    await sendEmailVerification(result.user)
    return result.user
  } catch (error) {
    throw error
  }
}

// Sign in with Email/Password
export const signInWithEmail = async (email, password) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password)
    return result.user
  } catch (error) {
    console.error('Error signing in with email:', error)
    throw error
  }
}


// Reset password
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email)
  } catch (error) {
    console.error('Error resetting password:', error)
    throw error
  }
}

// Sign out
export const signOut = async () => {
  try {
    await firebaseSignOut(auth)
  } catch (error) {
    console.error('Error signing out:', error)
    throw error
  }
}

// Listen to auth state changes
export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback)
}

// Get current user
export const getCurrentUser = () => {
  return auth.currentUser
}

// Resend verification email
export const resendVerificationEmail = async () => {
  try {
    const user = auth.currentUser
    if (user && !user.emailVerified) {
      await sendEmailVerification(user)
    }
  } catch (error) {
    throw error
  }
}

// Delete user account
export const deleteUserAccount = async () => {
  try {
    const user = auth.currentUser
    if (user) {
      // Réauthentifier l'utilisateur avant suppression
      // Si connecté via Google, réauthentifier avec Google
      const providerData = user.providerData[0]
      if (providerData && providerData.providerId === 'google.com') {
        await reauthenticateWithPopup(user, googleProvider)
      }
      
      // Supprimer le compte
      await deleteUser(user)
    }
  } catch (error) {
    console.error('Error deleting user account:', error)
    throw error
  }
}
