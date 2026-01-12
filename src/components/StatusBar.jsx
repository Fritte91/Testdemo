import { getIdToken, isTokenExpired } from '../lib/liffAuth'

export function StatusBar({ liffStatus, lineProfile }) {
  const token = getIdToken()
  const hasToken = liffStatus && token !== null
  const tokenExpired = hasToken && isTokenExpired(token)
  const tokenPreview = token ? `${token.substring(0, 20)}...${token.substring(token.length - 10)}` : 'N/A'
  
  // Calculate time until expiration
  let timeUntilExpiry = null
  if (token && !tokenExpired) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const exp = payload.exp
      if (exp) {
        const now = Math.floor(Date.now() / 1000)
        const secondsLeft = exp - now
        const minutesLeft = Math.floor(secondsLeft / 60)
        timeUntilExpiry = minutesLeft > 0 ? `${minutesLeft}m` : '<1m'
      }
    } catch (e) {
      // Ignore parsing errors
    }
  }
  
  return (
    <div className="status-bar">
      <div className="status-item">
        <span className="status-label">LIFF:</span>
        <span className={`status-value ${liffStatus ? 'success' : 'error'}`}>
          {liffStatus ? '✓ Logged In' : '✗ Not Logged In'}
        </span>
      </div>
      <div className="status-item">
        <span className="status-label">Token:</span>
        <span className={`status-value ${tokenExpired ? 'error' : hasToken ? 'success' : 'error'}`}>
          {tokenExpired ? '⚠️ Expired' : hasToken ? `✓ Valid${timeUntilExpiry ? ` (${timeUntilExpiry})` : ''}` : '✗ Missing'}
        </span>
      </div>
      {lineProfile && (
        <>
          <div className="status-item">
            <span className="status-label">LINE User:</span>
            <span className="status-value">
              {lineProfile.displayName || 'N/A'}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">User ID:</span>
            <span className="status-value">
              {lineProfile.userId || 'N/A'}
            </span>
          </div>
        </>
      )}
      {tokenExpired && (
        <div className="status-item" style={{ fontSize: '0.85em', color: '#721c24', marginTop: '5px', width: '100%' }}>
          ⚠️ Token expired. Click any action to refresh login automatically.
        </div>
      )}
    </div>
  )
}
