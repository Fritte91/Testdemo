import { getIdToken } from '../lib/liffAuth'

export function StatusBar({ liffStatus, lineProfile }) {
  const token = getIdToken()
  const hasToken = liffStatus && token !== null
  const tokenPreview = token ? `${token.substring(0, 20)}...${token.substring(token.length - 10)}` : 'N/A'
  
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
        <span className={`status-value ${hasToken ? 'success' : 'error'}`}>
          {hasToken ? '✓ Available' : '✗ Missing'}
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
      {hasToken && (
        <div className="status-item" style={{ fontSize: '0.8em', color: '#666', marginTop: '5px' }}>
          <span className="status-label">Token Preview:</span>
          <span className="status-value" style={{ fontFamily: 'monospace' }}>
            {tokenPreview}
          </span>
        </div>
      )}
    </div>
  )
}
