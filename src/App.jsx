import React, { useState } from 'react'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'

export default function App() {
  const { user, loading } = useAuth()
  const [showSignup, setShowSignup] = useState(false)

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg-primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            border: '3px solid var(--bg-tertiary)',
            borderTopColor: 'var(--accent)',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return showSignup ? (
      <Signup onSwitchToLogin={() => setShowSignup(false)} />
    ) : (
      <Login onSwitchToSignup={() => setShowSignup(true)} />
    )
  }

  return <Dashboard />
}
