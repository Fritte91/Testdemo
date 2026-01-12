export function StatusBar({ liffStatus, lineProfile }) {
  return (
    <div className="status-bar">
      <div className="status-item">
        <span className="status-label">LIFF:</span>
        <span className={`status-value ${liffStatus ? 'success' : 'error'}`}>
          {liffStatus ? '✓ Logged In' : '✗ Not Logged In'}
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
    </div>
  )
}
