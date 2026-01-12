import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import './index.css'

function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function handleCallback() {
      try {
        // Get the session from the OAuth callback
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          setError(`Session error: ${sessionError.message}`)
          setLoading(false)
          return
        }

        if (session) {
          // Session exists, redirect to home
          navigate('/', { replace: true })
        } else {
          // No session found
          setError('No session found. OAuth callback may have failed.')
          setLoading(false)
        }
      } catch (err) {
        console.error('Auth callback error:', err)
        setError(`Callback error: ${err.message}`)
        setLoading(false)
      }
    }

    handleCallback()
  }, [navigate])

  if (loading) {
    return (
      <div className="app">
        <div className="loading">Completing authentication...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app">
        <div className="error-banner">
          <strong>Authentication Error:</strong> {error}
        </div>
        <button onClick={() => navigate('/')} className="action-btn" style={{ marginTop: '20px' }}>
          Return to Home
        </button>
      </div>
    )
  }

  return null
}

export default AuthCallback
