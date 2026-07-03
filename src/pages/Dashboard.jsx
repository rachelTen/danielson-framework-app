import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { LogOut, Plus, Clock, FileText, Loader, Trash2, ArrowRight, Download, X, ChevronLeft, AlertCircle } from 'lucide-react'
import AssessmentWizard from '../components/AssessmentWizard'

const RATINGS = [
  { value: 'unsatisfactory', label: 'Unsatisfactory', score: 1 },
  { value: 'basic', label: 'Basic', score: 2 },
  { value: 'proficient', label: 'Proficient', score: 3 },
  { value: 'distinguished', label: 'Distinguished', score: 4 }
]

export default function Dashboard() {
  const { user, profile, signOut } = useAuth()
  const [assessments, setAssessments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showWizard, setShowWizard] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [viewingAssessment, setViewingAssessment] = useState(null)
  const [assessmentResponses, setAssessmentResponses] = useState([])
  const [assessmentRatings, setAssessmentRatings] = useState({})
  const [loadingResponses, setLoadingResponses] = useState(false)
  const [downloadError, setDownloadError] = useState('')

  useEffect(() => {
    if (user) fetchAssessments()
  }, [user])

  const fetchAssessments = async () => {
    try {
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      setAssessments(data || [])
    } catch (error) {
      console.error('Failed to fetch assessments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAssessment = async (assessmentId) => {
    if (!window.confirm('Are you sure you want to delete this assessment? This cannot be undone.')) return
    setDeleting(assessmentId)
    try {
      const { error } = await supabase
        .from('assessments')
        .delete()
        .eq('id', assessmentId)
      if (error) throw error
      setAssessments(prev => prev.filter(a => a.id !== assessmentId))
    } catch (error) {
      console.error('Failed to delete assessment:', error)
    } finally {
      setDeleting(null)
    }
  }

  const handleSignOut = async () => {
    try { await signOut() } catch (error) { console.error('Failed to sign out:', error) }
  }

  const handleViewAssessment = async (assessment) => {
    setViewingAssessment(assessment)
    setLoadingResponses(true)
    setDownloadError('')
    try {
      const { data, error } = await supabase
        .from('assessment_responses')
        .select('*')
        .eq('assessment_id', assessment.id)
      if (error) throw error
      setAssessmentResponses(data || [])
      const ratingsMap = {}
      data?.forEach(r => {
        if (r.rating) ratingsMap[r.component_code] = r.rating
      })
      setAssessmentRatings(ratingsMap)
    } catch (error) {
      console.error('Failed to load responses:', error)
      setDownloadError('Failed to load assessment responses')
    } finally {
      setLoadingResponses(false)
    }
  }

  const generateAssessmentContent = (assessment, responses, ratings) => {
    const lines = [
      'DANIELSON FRAMEWORK SELF-ASSESSMENT',
      `Title: ${assessment.title}`,
      `Date: ${new Date(assessment.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
      '',
      '=====',
      ''
    ]
    const domains = ['domain1', 'domain2', 'domain3', 'domain4']
    const domainNames = {
      domain1: 'DOMAIN 1: PLANNING AND PREPARATION',
      domain2: 'DOMAIN 2: THE CLASSROOM ENVIRONMENT',
      domain3: 'DOMAIN 3: INSTRUCTION',
      domain4: 'DOMAIN 4: PROFESSIONAL RESPONSIBILITIES'
    }
    domains.forEach(domain => {
      const domainNum = domain.replace('domain', '')
      const domainResponses = responses.filter(r => r.domain_number === parseInt(domainNum))
      if (domainResponses.length > 0) {
        lines.push(domainNames[domain])
        lines.push('')
        domainResponses.forEach(r => {
          const rating = RATINGS.find(rat => rat.value === ratings[r.component_code])
          lines.push(`${r.component_code}: ${r.component_name}`)
          lines.push(`Rating: ${rating ? rating.label : 'Not rated'}`)
          lines.push('')
          lines.push(`  Q: Component reflection`)
          lines.push(`  A: ${r.response_text || '(No response)'}`)
          lines.push('')
        })
        lines.push('-----')
        lines.push('')
      }
    })
    lines.push('OVERALL SUMMARY')
    const allRatings = Object.values(ratings).map(v => RATINGS.find(r => r.value === v)?.score).filter(Boolean)
    if (allRatings.length > 0) {
      const avg = allRatings.reduce((a, b) => a + b, 0) / allRatings.length
      lines.push(`Average Rating: ${avg.toFixed(2)}`)
    }
    return lines
  }

  const handleDownloadPDF = async () => {
    try {
      setDownloadError('')
      const { jsPDF } = await import('jspdf')
      const lines = generateAssessmentContent(viewingAssessment, assessmentResponses, assessmentRatings)
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      let yPos = 10
      const lineHeight = 5
      const margin = 10

      lines.forEach((line) => {
        if (yPos > pageHeight - 10) {
          doc.addPage()
          yPos = 10
        }
        if (line.startsWith('DOMAIN') || line.startsWith('OVERALL') || line === '') {
          doc.setFontSize(line === '' ? 10 : line.startsWith('OVERALL') ? 12 : 11)
          doc.setFont(undefined, line === '' ? 'normal' : 'bold')
        } else {
          doc.setFontSize(10)
          doc.setFont(undefined, 'normal')
        }
        const wrapped = doc.splitTextToSize(line || ' ', pageWidth - margin * 2)
        wrapped.forEach((wrappedLine) => {
          if (yPos > pageHeight - 10) {
            doc.addPage()
            yPos = 10
          }
          doc.text(wrappedLine, margin, yPos)
          yPos += lineHeight
        })
      })

      doc.save(`${viewingAssessment.title.replace(/\s+/g, '-').toLowerCase()}-assessment.pdf`)
    } catch (err) {
      console.error('PDF download failed:', err)
      setDownloadError('Failed to download PDF file. Please try again.')
    }
  }

  const handleDownloadTXT = async () => {
    try {
      setDownloadError('')
      const lines = generateAssessmentContent(viewingAssessment, assessmentResponses, assessmentRatings)
      const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${viewingAssessment.title.replace(/\s+/g, '-').toLowerCase()}-assessment.txt`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('TXT download failed:', err)
      setDownloadError('Failed to download TXT file. Please try again.')
    }
  }

  if (showWizard) {
    return <AssessmentWizard onComplete={() => { setShowWizard(false); fetchAssessments() }} />
  }

  // Assessment Viewer Modal
  if (viewingAssessment) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <nav style={{
          borderBottom: '1px solid var(--border-light)',
          background: 'rgba(247, 248, 245, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          position: 'sticky', top: 0, zIndex: 40
        }}>
          <div style={{ maxWidth: 960, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              onClick={() => { setViewingAssessment(null); setAssessmentResponses([]); setAssessmentRatings({}) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500,
                cursor: 'pointer', transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-tertiary)'; e.currentTarget.style.borderColor = '#D1D5DB' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)' }}
            >
              <ChevronLeft style={{ width: 14, height: 14 }} />
              Back to Dashboard
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={handleDownloadPDF}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 'var(--radius-md)',
                  border: 'none', background: 'var(--accent)',
                  color: '#fff', fontSize: 13, fontWeight: 500,
                  cursor: 'pointer', transition: 'all 0.2s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}
              >
                <Download style={{ width: 14, height: 14 }} />
                PDF
              </button>
              <button
                onClick={handleDownloadTXT}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)', background: 'transparent',
                  color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500,
                  cursor: 'pointer', transition: 'all 0.2s ease'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-tertiary)'; e.currentTarget.style.borderColor = '#D1D5DB' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)' }}
              >
                <Download style={{ width: 14, height: 14 }} />
                TXT
              </button>
            </div>
          </div>
        </nav>

        <main style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
          {downloadError && (
            <div style={{
              marginBottom: 20, padding: '12px 16px',
              background: '#FEF2F2', border: '1px solid #FECACA',
              borderRadius: 'var(--radius-md)',
              fontSize: 13, color: '#991B1B',
              display: 'flex', alignItems: 'center', gap: 8
            }}>
              <AlertCircle style={{ width: 16, height: 16 }} />
              {downloadError}
            </div>
          )}

          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
              {viewingAssessment.title}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
              Created {new Date(viewingAssessment.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {loadingResponses ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
              <Loader style={{ width: 28, height: 28, color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : assessmentResponses.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '60px 24px',
              background: 'var(--bg-elevated)', borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--border-light)'
            }}>
              <FileText style={{ width: 32, height: 32, color: 'var(--text-tertiary)', marginBottom: 12 }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                No responses recorded for this assessment.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {assessmentResponses.map((response) => {
                const rating = RATINGS.find(r => r.value === assessmentRatings[response.component_code])
                return (
                  <div
                    key={response.id}
                    style={{
                      background: 'var(--bg-elevated)',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--border-light)',
                      padding: '20px 24px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {response.component_code}: {response.component_name}
                      </h3>
                      {rating && (
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: 'var(--radius-full)',
                          background: rating.score === 4 ? '#F0FDF4' : rating.score === 3 ? '#EFF6FF' : rating.score === 2 ? '#FFFBEB' : '#FEF2F2',
                          border: `1px solid ${rating.score === 4 ? '#BBF7D0' : rating.score === 3 ? '#BFDBFE' : rating.score === 2 ? '#FDE68A' : '#FECACA'}`,
                          fontSize: 12, fontWeight: 600,
                          color: rating.score === 4 ? '#166534' : rating.score === 3 ? '#1E40AF' : rating.score === 2 ? '#92400E' : '#991B1B'
                        }}>
                          {rating.label}
                        </span>
                      )}
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {response.response_text || 'No response provided'}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </main>
      </div>
    )
  }

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
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 'var(--radius-sm)',
              background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 14, fontWeight: 700
            }}>
              D
            </div>
            <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
              Danielson Framework
            </span>
          </div>
          <button
            onClick={handleSignOut}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-tertiary)'; e.currentTarget.style.borderColor = '#D1D5DB' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)' }}
          >
            <LogOut style={{ width: 14, height: 14 }} />
            Sign Out
          </button>
        </div>
      </nav>

      {/* Main */}
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, lineHeight: 1.2 }}>
            Welcome, {profile?.full_name || user.email?.split('@')[0]}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.6 }}>
            Track and reflect on your teaching practice through self-assessment.
          </p>
        </div>

        {/* New Assessment CTA */}
        <button
          onClick={() => setShowWizard(true)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            width: '100%', padding: '20px 24px', marginBottom: 36,
            background: 'var(--accent-light)', border: `2px dashed var(--accent)`,
            borderRadius: 'var(--radius-lg)', color: 'var(--accent)',
            fontSize: 15, fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-subtle)'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent-light)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
        >
          <Plus style={{ width: 20, height: 20 }} />
          Begin New Self-Assessment
        </button>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <Loader style={{ width: 28, height: 28, color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : assessments.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 24px',
            background: 'var(--bg-elevated)', borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--border-light)'
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'var(--bg-tertiary)', margin: '0 auto 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <FileText style={{ width: 24, height: 24, color: 'var(--text-tertiary)' }} />
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
              No assessments yet
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, maxWidth: 340, margin: '0 auto' }}>
              Begin your first self-assessment to start tracking your professional growth.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, letterSpacing: '0.02em' }}>
              PAST ASSESSMENTS
            </h3>
            {assessments.map((assessment, idx) => (
              <div
                key={assessment.id}
                onClick={() => handleViewAssessment(assessment)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '18px 24px',
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-light)',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.borderColor = '#D1D5DB' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.borderColor = 'var(--border-light)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 'var(--radius-md)',
                    background: 'var(--accent-light)', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <FileText style={{ width: 18, height: 18, color: 'var(--accent)' }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h4 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {assessment.title}
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--text-tertiary)' }}>
                        <Clock style={{ width: 12, height: 12 }} />
                        {new Date(assessment.created_at).toLocaleDateString('en-US', {
                          year: 'numeric', month: 'short', day: 'numeric'
                        })}
                      </span>
                      {assessment.completed_at && (
                        <span style={{
                          fontSize: 11, fontWeight: 600, color: '#166534',
                          background: '#F0FDF4', border: '1px solid #BBF7D0',
                          padding: '2px 8px', borderRadius: 'var(--radius-full)'
                        }}>
                          Completed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={e => e.stopPropagation()}>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleViewAssessment(assessment) }}
                    style={{
                      padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)', background: 'transparent',
                      color: 'var(--text-secondary)', cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex', alignItems: 'center', gap: 4,
                      fontSize: 12, fontWeight: 500
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-tertiary)'; e.currentTarget.style.borderColor = '#D1D5DB' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)' }}
                  >
                    <ArrowRight style={{ width: 14, height: 14 }} />
                    View
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteAssessment(assessment.id) }}
                    disabled={deleting === assessment.id}
                    style={{
                      padding: '8px', borderRadius: 'var(--radius-sm)',
                      border: 'none', background: 'transparent',
                      color: 'var(--text-tertiary)', cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.color = '#DC2626' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-tertiary)' }}
                  >
                    <Trash2 style={{ width: 16, height: 16 }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
