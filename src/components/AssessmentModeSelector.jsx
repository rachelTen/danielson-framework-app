import React, { useState } from 'react'
import { ArrowRight, Clock, BookOpen, Zap } from 'lucide-react'

export default function AssessmentModeSelector({ onSelectMode, user }) {
  const [hoveredMode, setHoveredMode] = useState(null)

  const modes = [
    {
      id: 'abridged',
      label: 'Abridged Reflection',
      description: 'Fast self-reflection for busy teachers',
      estimatedTime: '30–45 minutes',
      features: [
        'Rate all components quickly',
        'Written reflection only for growth areas',
        'Targeted feedback on low scores',
        'Perfect for quick pulse-check'
      ],
      icon: Zap,
      recommended: true,
      color: '#5B8A72'
    },
    {
      id: 'comprehensive',
      label: 'Full Danielson Framework',
      description: 'Complete assessment with all domains and components',
      estimatedTime: '~30 min per domain',
      features: [
        'All questions and reflections',
        'Examples and starters throughout',
        'Comprehensive growth plan',
        'In-depth professional development'
      ],
      icon: BookOpen,
      recommended: false,
      color: '#5B8A72'
    }
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Nav */}
      <nav style={{
        borderBottom: '1px solid var(--border-light)',
        background: 'rgba(247, 248, 245, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 40
      }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 'var(--radius-sm)',
            background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 14, fontWeight: 700
          }}>
            D
          </div>
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginLeft: 10 }}>
            Danielson Framework
          </span>
        </div>
      </nav>

      {/* Main */}
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '60px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <h1 style={{ fontSize: 36, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, lineHeight: 1.2 }}>
            Begin Your Self-Assessment
          </h1>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 560, margin: '0 auto' }}>
            Choose how you want to reflect on your teaching practice. You can switch modes later or complete multiple assessments.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginBottom: 60 }}>
          {modes.map((mode) => {
            const Icon = mode.icon
            const isHovered = hoveredMode === mode.id
            return (
              <div
                key={mode.id}
                onMouseEnter={() => setHoveredMode(mode.id)}
                onMouseLeave={() => setHoveredMode(null)}
                style={{
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-xl)',
                  border: `2px solid ${isHovered ? mode.color : 'var(--border-light)'}`,
                  padding: 32,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: isHovered ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
                  transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
                  position: 'relative'
                }}
              >
                {mode.recommended && (
                  <div style={{
                    position: 'absolute', top: -12, right: 24,
                    background: mode.color, color: '#fff',
                    padding: '4px 12px', borderRadius: 'var(--radius-full)',
                    fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em'
                  }}>
                    Recommended
                  </div>
                )}

                <div style={{
                  width: 48, height: 48,
                  background: `${mode.color}1a`,
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 16
                }}>
                  <Icon style={{ width: 24, height: 24, color: mode.color }} />
                </div>

                <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                  {mode.label}
                </h2>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
                  {mode.description}
                </p>

                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 14px', borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-primary)', marginBottom: 20,
                  fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)'
                }}>
                  <Clock style={{ width: 14, height: 14 }} />
                  {mode.estimatedTime}
                </div>

                <ul style={{ marginBottom: 24 }}>
                  {mode.features.map((feature, idx) => (
                    <li key={idx} style={{
                      fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6,
                      marginBottom: 8, display: 'flex', gap: 8,
                      alignItems: 'flex-start'
                    }}>
                      <span style={{ color: mode.color, fontWeight: 700, marginTop: 3 }}>•</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => onSelectMode(mode.id)}
                  style={{
                    width: '100%',
                    padding: '12px 20px',
                    background: isHovered ? mode.color : 'transparent',
                    color: isHovered ? '#fff' : mode.color,
                    border: `2px solid ${mode.color}`,
                    borderRadius: 'var(--radius-md)',
                    fontSize: 14, fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                  }}
                >
                  Begin
                  <ArrowRight style={{ width: 16, height: 16 }} />
                </button>
              </div>
            )
          })}
        </div>

        {/* Info section */}
        <div style={{
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-light)',
          padding: 32,
          textAlign: 'center'
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
            Flexible Assessment Experience
          </h3>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 560, margin: '0 auto' }}>
            Your progress is automatically saved after each section. You can pause, resume later, and switch between modes anytime. Whether you choose the quick reflection or full framework, your growth matters.
          </p>
        </div>
      </main>
    </div>
  )
}
