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
 * Check if token is expired or about to expire (within 5 minutes)
 */
export function isTokenExpired(token) {
  if (!token) return true
  
  try {
    // Decode JWT payload (second part of token)
    const parts = token.split('.')
    if (parts.length !== 3) return true
    
    const payload = JSON.parse(atob(parts[1]))
    const exp = payload.exp
    if (!exp) return true
    
    const now = Math.floor(Date.now() / 1000)
    // Check if expired or expires in less than 5 minutes
    return exp < (now + 300)
  } catch (error) {
    console.error('Error checking token expiration:', error)
    return true // If can't parse, assume expired
  }
}

/**
 * Get fresh token, refreshing LINE login if needed
 * Note: LINE tokens cannot be refreshed - must re-login if expired
 */
export async function getFreshToken() {
  if (!liffInitialized) {
    throw new Error('LIFF not initialized')
  }
  
  if (!liff.isLoggedIn()) {
    // Not logged in, redirect to login
    console.log('[liffAuth] Not logged in, redirecting to LINE login...')
    liff.login({ redirectUri: window.location.href })
    return null // Will redirect away
  }
  
  let token = getIdToken()
  
  // Check if token is expired or about to expire
  if (!token || isTokenExpired(token)) {
    console.log('[liffAuth] Token expired or about to expire, redirecting to LINE login...')
    console.log('[liffAuth] Token expiration check:', token ? {
      expired: isTokenExpired(token),
      tokenPreview: token.substring(0, 50) + '...'
    } : 'No token')
    
    // LINE tokens cannot be refreshed - must re-login
    // Redirect to LINE login to get a fresh token
    liff.login({ redirectUri: window.location.href })
    return null // Will redirect away
  }
  
  return token
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
