import { useState } from 'react'

export function JsonPanel({ request, response, error, title }) {
  const [copied, setCopied] = useState({ request: false, response: false, error: false })

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied({ ...copied, [type]: true })
      setTimeout(() => setCopied({ ...copied, [type]: false }), 2000)
    })
  }

  const formatJson = (obj) => {
    if (!obj) return null
    try {
      return JSON.stringify(obj, null, 2)
    } catch {
      return String(obj)
    }
  }

  return (
    <div className="json-panel">
      {title && <h3>{title}</h3>}
      
      {request && (
        <div className="json-section">
          <div className="json-header">
            <span>Request</span>
            <button 
              onClick={() => copyToClipboard(formatJson(request), 'request')}
              className="copy-btn"
            >
              {copied.request ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <pre className="json-content">{formatJson(request)}</pre>
        </div>
      )}

      {error && (
        <div className="json-section error">
          <div className="json-header">
            <span>Error</span>
            <button 
              onClick={() => copyToClipboard(formatJson(error), 'error')}
              className="copy-btn"
            >
              {copied.error ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <pre className="json-content">{formatJson(error)}</pre>
        </div>
      )}

      {response && (
        <div className="json-section">
          <div className="json-header">
            <span>Response</span>
            <button 
              onClick={() => copyToClipboard(formatJson(response), 'response')}
              className="copy-btn"
            >
              {copied.response ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <pre className="json-content">{formatJson(response)}</pre>
        </div>
      )}

      {!request && !response && !error && (
        <div className="json-section empty">
          <p>No data to display</p>
        </div>
      )}
    </div>
  )
}
