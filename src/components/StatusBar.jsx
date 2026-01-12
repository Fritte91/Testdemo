export function StatusBar({ liffStatus, supabaseUser, supabaseSession }) {
  return (
    <div className="status-bar">
      <div className="status-item">
        <span className="status-label">LIFF:</span>
        <span className={`status-value ${liffStatus ? 'success' : 'error'}`}>
          {liffStatus ? '✓ Logged In' : '✗ Not Logged In'}
        </span>
      </div>
      <div className="status-item">
        <span className="status-label">Supabase Session:</span>
        <span className={`status-value ${supabaseSession ? 'success' : 'error'}`}>
          {supabaseSession ? '✓ Active' : '✗ No Session'}
        </span>
      </div>
      <div className="status-item">
        <span className="status-label">User ID:</span>
        <span className="status-value">
          {supabaseUser || 'N/A'}
        </span>
      </div>
    </div>
  )
}
