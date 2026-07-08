import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Mail, Lock, CircleAlert as AlertCircle, Loader } from 'lucide-react'

export default function Login({ onSwitchToSignup }) {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
    } catch (err) {
      setError(err.message || 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '12px 16px 12px 44px',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    fontSize: 14, color: 'var(--text-primary)',
    outline: 'none', transition: 'all 0.2s ease',
    boxShadow: 'var(--shadow-sm)',
    lineHeight: 1.5
  }

  const handleFocus = (e) => {
    e.target.style.borderColor = 'var(--accent)'
    e.target.style.boxShadow = 'var(--shadow-focus)'
    e.target.style.background = 'var(--bg-secondary)'
  }

  const handleBlur = (e) => {
    e.target.style.borderColor = 'var(--border)'
    e.target.style.boxShadow = 'var(--shadow-sm)'
    e.target.style.background = 'var(--bg-primary)'
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-primary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24
    }}>
      <div className="animate-scale-in" style={{ maxWidth: 400, width: '100%' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 'var(--radius-md)',
            background: 'var(--accent)', margin: '0 auto 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 22, fontWeight: 700
          }}>
            D
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
            Danielson Framework
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            Sign in to your account
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border-light)',
          padding: '32px 28px'
        }}>
          {error && (
            <div style={{
              marginBottom: 20, padding: '12px 16px',
              background: '#FEF2F2', border: '1px solid #FECACA',
              borderRadius: 'var(--radius-md)', display: 'flex', gap: 10, alignItems: 'flex-start'
            }}>
              <AlertCircle style={{ width: 16, height: 16, color: '#DC2626', flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 13, color: '#991B1B', lineHeight: 1.5 }}>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 8 }}>
                Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, color: 'var(--text-tertiary)' }} />
                <input
                  type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={inputStyle}
                  onFocus={handleFocus} onBlur={handleBlur}
                  placeholder="your@email.com"
                  required disabled={loading}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 8 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, color: 'var(--text-tertiary)' }} />
                <input
                  type="password" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={inputStyle}
                  onFocus={handleFocus} onBlur={handleBlur}
                  placeholder="Enter your password"
                  required disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              style={{
                width: '100%', padding: '12px 24px', marginTop: 4,
                background: loading ? 'var(--bg-tertiary)' : 'var(--accent)',
                color: loading ? 'var(--text-tertiary)' : '#fff',
                border: 'none', borderRadius: 'var(--radius-md)',
                fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: loading ? 'none' : '0 2px 8px rgba(91, 138, 114, 0.3)'
              }}
              onMouseEnter={e => { if (!loading) e.target.style.background = 'var(--accent-hover)' }}
              onMouseLeave={e => { if (!loading) e.target.style.background = 'var(--accent)' }}
            >
              {loading && <Loader style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />}
              Sign In
            </button>
          </form>

          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Don't have an account?{' '}
              <button
                onClick={onSwitchToSignup}
                style={{
                  background: 'none', border: 'none', color: 'var(--accent)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  padding: 0, transition: 'opacity 0.15s ease'
                }}
                onMouseEnter={e => e.target.style.opacity = 0.8}
                onMouseLeave={e => e.target.style.opacity = 1}
              >
                Create one
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
