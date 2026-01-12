import liff from '@line/liff'

const LIFF_ID = import.meta.env.VITE_LIFF_ID

if (!LIFF_ID) {
  throw new Error('Missing VITE_LIFF_ID in environment variables')
}

let liffInitialized = false

/**
 * Initialize LIFF and ensure user is logged in
 */
export async function initLiff() {
  if (liffInitialized) {
    return
  }

  try {
    await liff.init({ liffId: LIFF_ID })
    liffInitialized = true

    if (!liff.isLoggedIn()) {
      liff.login({ redirectUri: window.location.href })
      return false
    }

    return true
  } catch (error) {
    console.error('LIFF initialization error:', error)
    throw error
  }
}

/**
 * Get the LINE ID token
 */
export function getIdToken() {
  if (!liffInitialized || !liff.isLoggedIn()) {
    return null
  }
  return liff.getIDToken()
}

/**
 * Get the LINE user profile
 */
export async function getProfile() {
  if (!liffInitialized || !liff.isLoggedIn()) {
    return null
  }
  try {
    return await liff.getProfile()
  } catch (error) {
    console.error('Error getting LIFF profile:', error)
    return null
  }
}

/**
 * Check if LIFF is logged in
 */
export function isLoggedIn() {
  return liffInitialized && liff.isLoggedIn()
}
