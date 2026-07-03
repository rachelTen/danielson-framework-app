import React, { useState } from 'react'
import { Lightbulb } from 'lucide-react'

export default function QuestionSupport({ example, starters }) {
  const [open, setOpen] = useState(false)

  if (!example && (!starters || starters.length === 0)) return null

  return (
    <div style={{ marginTop: 8, marginBottom: 8 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 10px', fontSize: 12, fontWeight: 500,
          color: open ? 'var(--accent)' : 'var(--text-tertiary)',
          background: open ? 'var(--accent-light)' : 'transparent',
          border: '1px solid', borderColor: open ? 'var(--accent-light)' : 'var(--border)',
          borderRadius: 'var(--radius-full)', cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
      >
        <Lightbulb style={{ width: 13, height: 13 }} />
        {open ? 'Hide tips' : 'Example + Starters'}
      </button>

      {open && (
        <div
          style={{
            marginTop: 10, padding: '14px 16px',
            background: 'var(--accent-subtle)',
            border: '1px solid var(--accent-light)',
            borderRadius: 'var(--radius-md)',
            fontSize: 13, lineHeight: 1.6
          }}
        >
          {example && (
            <div style={{ marginBottom: starters?.length ? 10 : 0 }}>
              <span style={{ fontWeight: 600, color: 'var(--accent)' }}>Example: </span>
              <span style={{ color: 'var(--text-secondary)' }}>{example}</span>
            </div>
          )}
          {starters?.length > 0 && (
            <div>
              <span style={{ fontWeight: 600, color: 'var(--accent)' }}>Sentence starters: </span>
              <span style={{ color: 'var(--text-secondary)' }}>
                {starters.join(' ... ')} ...
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
