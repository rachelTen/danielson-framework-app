import React, { useState, useEffect, useRef } from 'react'
import { frameworkEnhanced } from '../data/frameworkEnhanced'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { autosaveService, createAutoSaveDebouncer } from '../lib/autosave'
import { ChevronRight, ChevronLeft, Save, Loader, CircleCheck as CheckCircle, Download, Sparkles, Eye, EyeOff, LogOut } from 'lucide-react'

const RATINGS = [
  { value: 'unsatisfactory', label: 'Unsatisfactory', shortLabel: 'U', score: 1, bg: '#FEF2F2', border: '#FECACA', text: '#991B1B', dot: '#EF4444' },
  { value: 'basic', label: 'Basic', shortLabel: 'B', score: 2, bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', dot: '#F59E0B' },
  { value: 'proficient', label: 'Proficient', shortLabel: 'P', score: 3, bg: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF', dot: '#3B82F6' },
  { value: 'distinguished', label: 'Distinguished', shortLabel: 'D', score: 4, bg: '#F0FDF4', border: '#BBF7D0', text: '#166534', dot: '#22C55E' }
]

const REFLECTION_THRESHOLD = 2.5

export default function AssessmentWizard({ onComplete, mode = 'comprehensive' }) {
  const { user } = useAuth()
  const [currentDomain, setCurrentDomain] = useState('domain1')
  const [assessmentId, setAssessmentId] = useState(null)
  const [assessmentTitle, setAssessmentTitle] = useState('')
  const [responses, setResponses] = useState({})
  const [ratings, setRatings] = useState({})
  const [saving, setSaving] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [error, setError] = useState('')
  const [downloadError, setDownloadError] = useState('')
  const [lastSaved, setLastSaved] = useState(null)
  const [focusMode, setFocusMode] = useState(false)
  const [expandedExamples, setExpandedExamples] = useState({})
  const autoSaveDebounce = useRef(createAutoSaveDebouncer())

  const domains = [
    { key: 'domain1', label: 'Planning & Preparation', icon: '1', step: 1 },
    { key: 'domain2', label: 'Learning Environments', icon: '2', step: 2 },
    { key: 'domain3', label: 'Learning Experiences', icon: '3', step: 3 },
    { key: 'domain4', label: 'Principled Teaching', icon: '4', step: 4 }
  ]

  const currentDomainData = frameworkEnhanced[currentDomain]
  const currentDomainIndex = domains.findIndex(d => d.key === currentDomain)

  // Initialize from saved data
  useEffect(() => {
    const initializeAssessment = async () => {
      try {
        // Check for draft in local storage
        const draftKey = `assessment_draft_${user.id}`
        const draft = localStorage.getItem(draftKey)
        if (draft) {
          const draftData = JSON.parse(draft)
          setAssessmentId(draftData.id)
          setAssessmentTitle(draftData.title)
          setResponses(draftData.responses)
          setRatings(draftData.ratings)
          setCurrentDomain(draftData.currentDomain || 'domain1')
          setLastSaved(new Date(draftData.lastSaved))
        }
      } catch (err) {
        console.error('Failed to load draft:', err)
      }
    }
    if (user) initializeAssessment()
  }, [user])

  // Auto-save on changes
  const triggerAutoSave = () => {
    if (!assessmentId || !assessmentTitle) return

    autoSaveDebounce.current(async () => {
      const draftKey = `assessment_draft_${user.id}`
      const draftData = {
        id: assessmentId,
        title: assessmentTitle,
        responses,
        ratings,
        currentDomain,
        mode,
        lastSaved: new Date().toISOString()
      }
      localStorage.setItem(draftKey, JSON.stringify(draftData))
      setLastSaved(new Date())
    })
  }

  useEffect(() => {
    triggerAutoSave()
  }, [responses, ratings])

  const handleResponseChange = (responseKey, value) => {
    setResponses(prev => ({ ...prev, [responseKey]: value }))
  }

  const handleRatingChange = (componentCode, rating) => {
    setRatings(prev => ({ ...prev, [componentCode]: rating }))
  }

  const toggleExample = (componentCode) => {
    setExpandedExamples(prev => ({
      ...prev,
      [componentCode]: !prev[componentCode]
    }))
  }

  // Calculate if component should show reflection based on rating
  const shouldShowReflection = (componentCode) => {
    if (!focusMode) return true
    const rating = RATINGS.find(r => r.value === ratings[componentCode])
    if (!rating) return true
    return rating.score <= REFLECTION_THRESHOLD
  }

  const getDomainRatingData = (domainKey) => {
    const prefix = domainKey.replace('domain', '')
    return Object.entries(ratings)
      .filter(([key]) => key.startsWith(prefix))
      .map(([, rating]) => RATINGS.find(r => r.value === rating))
      .filter(Boolean)
  }

  const calculateDomainAverage = (domainKey) => {
    const dr = getDomainRatingData(domainKey)
    if (dr.length === 0) return null
    return dr.reduce((sum, r) => sum + r.score, 0) / dr.length
  }

  const getAverageRating = (avg) => {
    if (!avg) return null
    if (avg < 1.5) return RATINGS[0]
    if (avg < 2.5) return RATINGS[1]
    if (avg < 3.5) return RATINGS[2]
    return RATINGS[3]
  }

  const handleStartAssessment = async () => {
    if (!assessmentTitle.trim()) {
      setError('Please enter an assessment title')
      return
    }

    setSaving(true)
    setError('')

    try {
      const { data: assessment, error: assessmentError } = await supabase
        .from('assessments')
        .insert({
          user_id: user.id,
          title: assessmentTitle,
          assessment_mode: mode,
          focus_on_growth_areas: focusMode,
          current_domain: currentDomain,
          is_completed: false,
          created_at: new Date(),
          updated_at: new Date()
        })
        .select()
        .maybeSingle()

      if (assessmentError) throw assessmentError
      setAssessmentId(assessment.id)
      setLastSaved(new Date())

      const draftKey = `assessment_draft_${user.id}`
      localStorage.setItem(draftKey, JSON.stringify({
        id: assessment.id,
        title: assessmentTitle,
        responses: {},
        ratings: {},
        currentDomain: 'domain1',
        mode,
        lastSaved: new Date().toISOString()
      }))
    } catch (err) {
      setError(err.message || 'Failed to start assessment')
    } finally {
      setSaving(false)
    }
  }

  const handleCompleteAssessment = async () => {
    setSaving(true)
    setError('')

    try {
      // Save all responses to database
      const responsesToInsert = Object.entries(responses).map(([responseKey, responseText]) => {
        const componentCode = responseKey.split('_')[0]
        const domainNum = parseInt(componentCode.charAt(0))
        const rating = ratings[componentCode] || null

        return {
          assessment_id: assessmentId,
          component_code: componentCode,
          component_name: componentCode,
          domain_number: domainNum,
          response_text: responseText,
          rating,
          requires_reflection: shouldShowReflection(componentCode)
        }
      })

      if (responsesToInsert.length > 0) {
        const { error: responsesError } = await supabase
          .from('assessment_responses')
          .upsert(responsesToInsert, { onConflict: 'assessment_id,component_code' })
        if (responsesError) throw responsesError
      }

      // Mark assessment as completed
      await supabase
        .from('assessments')
        .update({
          is_completed: true,
          last_saved_at: new Date().toISOString()
        })
        .eq('id', assessmentId)

      // Clear draft
      const draftKey = `assessment_draft_${user.id}`
      localStorage.removeItem(draftKey)

      setCompleted(true)
    } catch (err) {
      setError(err.message || 'Failed to complete assessment')
    } finally {
      setSaving(false)
    }
  }

  const generateAssessmentContent = () => {
    const lines = [
      'DANIELSON FRAMEWORK SELF-ASSESSMENT',
      '=====================================',
      `Title: ${assessmentTitle}`,
      `Mode: ${mode === 'comprehensive' ? 'Full Framework' : 'Abridged Reflection'}`,
      `Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
      '',
      ''
    ]

    domains.forEach(d => {
      const domainData = frameworkEnhanced[d.key]
      const avg = calculateDomainAverage(d.key)
      const avgRating = getAverageRating(avg)
      lines.push(`DOMAIN ${d.icon}: ${domainData.name.toUpperCase()}`)
      lines.push(`Overall Rating: ${avgRating ? avgRating.label : 'Not rated'}`)
      lines.push('-'.repeat(40))
      lines.push('')

      Object.entries(domainData.components).forEach(([code, component]) => {
        const rating = RATINGS.find(r => r.value === ratings[code])
        lines.push(`${code}: ${component.name}`)
        lines.push(`Rating: ${rating ? rating.label : 'Not rated'}`)
        lines.push('')

        component.prompts.forEach((prompt, idx) => {
          const key = `${code}_${idx}`
          const question = typeof prompt === 'string' ? prompt : prompt.question
          lines.push(`  Q: ${question}`)
          lines.push(`  A: ${responses[key] || '(No response)'}`)
          lines.push('')
        })
      })
      lines.push('')
    })

    const overallAvg = domains.reduce((sum, d) => {
      const avg = calculateDomainAverage(d.key)
      return sum + (avg || 0)
    }, 0) / domains.length

    const overallRating = getAverageRating(overallAvg)
    lines.push('OVERALL ASSESSMENT')
    lines.push('==================')
    lines.push(`Overall Rating: ${overallRating ? overallRating.label : 'Not rated'}`)
    lines.push(`Score: ${overallAvg ? overallAvg.toFixed(1) : 'N/A'} / 4.0`)

    return lines
  }

  const handleDownloadPDF = async () => {
    try {
      setDownloadError('')
      const { jsPDF } = await import('jspdf')
      const lines = generateAssessmentContent()
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

      doc.save(`${assessmentTitle.replace(/\s+/g, '-').toLowerCase()}-assessment.pdf`)
    } catch (err) {
      console.error('PDF download failed:', err)
      setDownloadError('Failed to download PDF. Please try again.')
    }
  }

  const handleDownloadDOCX = async () => {
    try {
      setDownloadError('')
      const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = await import('docx')
      const lines = generateAssessmentContent()

      const paragraphs = lines.map((line) => {
        let options = { alignment: AlignmentType.LEFT }
        let textOptions = {}

        if (line.startsWith('DANIELSON') || line.startsWith('OVERALL')) {
          options.heading = HeadingLevel.HEADING_1
          textOptions.bold = true
          textOptions.size = 28
        } else if (line.startsWith('DOMAIN')) {
          options.heading = HeadingLevel.HEADING_2
          textOptions.bold = true
          textOptions.size = 24
        } else if (line.startsWith('  Q:') || line.startsWith('  A:')) {
          textOptions.size = 22
        } else if (line === '' || line === '=====' || line.startsWith('-----')) {
          return new Paragraph({ text: '', spacing: { before: 100 } })
        }

        return new Paragraph({
          text: line || ' ',
          ...options,
          children: [new TextRun({ ...textOptions, text: line || ' ' })]
        })
      })

      const doc = new Document({ sections: [{ children: paragraphs }] })
      const blob = await Packer.toBlob(doc)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${assessmentTitle.replace(/\s+/g, '-').toLowerCase()}-assessment.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('DOCX download failed:', err)
      setDownloadError('Failed to download DOCX. Please try again.')
    }
  }

  const handleDownload = (format) => {
    if (format === 'pdf') {
      handleDownloadPDF()
    } else if (format === 'docx') {
      handleDownloadDOCX()
    }
  }

  const handleNext = () => {
    if (currentDomainIndex < domains.length - 1) {
      setCurrentDomain(domains[currentDomainIndex + 1].key)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handlePrevious = () => {
    if (currentDomainIndex > 0) {
      setCurrentDomain(domains[currentDomainIndex - 1].key)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Completion screen
  if (completed) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div className="animate-scale-in" style={{
          maxWidth: '440px',
          width: '100%',
          textAlign: 'center',
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-lg)',
          padding: '48px 40px'
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: '#F0FDF4', margin: '0 auto 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <CheckCircle style={{ width: 32, height: 32, color: '#22C55E' }} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
            Assessment Saved
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 32, lineHeight: 1.6 }}>
            Your self-assessment has been saved. Download a copy in your preferred format.
          </p>
          {downloadError && (
            <div style={{
              marginBottom: 20, padding: '12px 16px',
              background: '#FEF2F2', border: '1px solid #FECACA',
              borderRadius: 'var(--radius-md)',
              fontSize: 13, color: '#991B1B'
            }}>
              {downloadError}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            <button
              onClick={() => handleDownload('pdf')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '12px 24px', background: 'var(--accent)', color: '#fff',
                borderRadius: 'var(--radius-md)', border: 'none', fontSize: 14, fontWeight: 500,
                cursor: 'pointer', transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => e.target.style.background = 'var(--accent-hover)'}
              onMouseLeave={e => e.target.style.background = 'var(--accent)'}
            >
              <Download style={{ width: 16, height: 16 }} />
              Download as PDF
            </button>
            <button
              onClick={() => handleDownload('docx')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '12px 24px', background: 'transparent', color: 'var(--text-secondary)',
                borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: 14, fontWeight: 500,
                cursor: 'pointer', transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => { e.target.style.background = 'var(--bg-tertiary)'; e.target.style.borderColor = '#D1D5DB' }}
              onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'var(--border)' }}
            >
              <Download style={{ width: 16, height: 16 }} />
              Download as DOCX
            </button>
          </div>
          <button
            onClick={onComplete}
            style={{
              width: '100%',
              padding: '12px 24px', background: 'transparent', color: 'var(--text-secondary)',
              borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: 14, fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => { e.target.style.background = 'var(--bg-tertiary)'; e.target.style.borderColor = '#D1D5DB' }}
            onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'var(--border)' }}
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  // Title screen (before assessment starts)
  if (!assessmentId) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '60px 24px' }}>
          <div style={{ marginBottom: 50 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Sparkles style={{ width: 24, height: 24, color: 'var(--accent)' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {mode === 'comprehensive' ? 'Full Framework' : 'Abridged Reflection'}
              </span>
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, lineHeight: 1.2 }}>
              Charlotte Danielson Framework
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 16, lineHeight: 1.7 }}>
              {mode === 'comprehensive'
                ? 'Reflect on your teaching practice across four domains with comprehensive questions, examples, and guidance.'
                : 'Quick self-reflection. Rate all components, then provide targeted reflection only for growth areas.'}
            </p>
          </div>

          <div style={{ maxWidth: 420, marginBottom: 40 }}>
            <label style={{
              display: 'block', fontSize: 13, fontWeight: 500,
              color: 'var(--text-primary)', marginBottom: 8
            }}>
              Assessment Title
            </label>
            <input
              type="text"
              value={assessmentTitle}
              onChange={(e) => setAssessmentTitle(e.target.value)}
              placeholder="e.g., Spring 2025 Self-Evaluation"
              style={{
                width: '100%', padding: '12px 16px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                fontSize: 14, color: 'var(--text-primary)',
                outline: 'none', transition: 'all 0.2s ease'
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = 'var(--shadow-focus)' }}
              onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'var(--shadow-sm)' }}
            />
          </div>

          {mode === 'abridged' && (
            <div style={{ marginBottom: 40, padding: 20, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
              <button
                onClick={() => setFocusMode(!focusMode)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px',
                  background: focusMode ? 'var(--accent-light)' : 'transparent',
                  border: `1px solid ${focusMode ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer', transition: 'all 0.2s ease',
                  width: '100%'
                }}
                onMouseEnter={e => { if (!focusMode) { e.currentTarget.style.background = 'var(--bg-secondary)' } }}
                onMouseLeave={e => { if (!focusMode) { e.currentTarget.style.background = 'transparent' } }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: 4,
                  background: focusMode ? 'var(--accent)' : 'var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 12, fontWeight: 700
                }}>
                  {focusMode ? '✓' : ''}
                </div>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                  Focus on Growth Areas Only
                </span>
              </button>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>
                When enabled, you'll only write reflections for components rated below {REFLECTION_THRESHOLD}. Strengths are rated only.
              </p>
            </div>
          )}

          {error && (
            <div style={{
              marginBottom: 20, padding: '14px 18px',
              background: '#FEF2F2', border: '1px solid #FECACA',
              borderRadius: 'var(--radius-md)',
              fontSize: 14, color: '#991B1B'
            }}>
              {error}
            </div>
          )}

          <button
            onClick={handleStartAssessment}
            disabled={saving || !assessmentTitle}
            style={{
              width: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '14px 24px',
              background: saving || !assessmentTitle ? 'var(--bg-tertiary)' : 'var(--accent)',
              color: saving || !assessmentTitle ? 'var(--text-tertiary)' : '#fff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontSize: 16, fontWeight: 600,
              cursor: saving || !assessmentTitle ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => { if (!saving && assessmentTitle) e.currentTarget.style.background = 'var(--accent-hover)' }}
            onMouseLeave={e => { if (!saving && assessmentTitle) e.currentTarget.style.background = 'var(--accent)' }}
          >
            {saving ? <Loader style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> : 'Begin Assessment'}
          </button>
        </div>
      </div>
    )
  }

  const progressPct = ((currentDomainIndex + 1) / domains.length) * 100
  const domainAvg = calculateDomainAverage(currentDomain)
  const domainAvgRating = getAverageRating(domainAvg)

  const componentCount = Object.keys(currentDomainData.components).length
  const ratedCount = Object.entries(ratings).filter(([k]) => k.startsWith(currentDomain.replace('domain', ''))).length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(247, 248, 245, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-light)'
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '16px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', letterSpacing: '0.02em' }}>
              Domain {currentDomainIndex + 1} of {domains.length}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {lastSaved && `Last saved: ${autosaveService.formatLastSaved(lastSaved instanceof Date ? lastSaved.toISOString() : lastSaved)}`}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>
                {Math.round(progressPct)}% complete
              </span>
            </div>
          </div>
          <div style={{
            width: '100%', height: 4, borderRadius: 2,
            background: 'var(--bg-tertiary)', overflow: 'hidden'
          }}>
            <div style={{
              height: '100%', borderRadius: 2,
              background: 'var(--accent)',
              transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
              width: `${progressPct}%`
            }} />
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
            {domains.map((d, i) => (
              <button
                key={d.key}
                onClick={() => { setCurrentDomain(d.key); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', borderRadius: 'var(--radius-full)',
                  fontSize: 12, fontWeight: i === currentDomainIndex ? 600 : 400,
                  border: '1px solid',
                  borderColor: i === currentDomainIndex ? 'var(--accent)' : i < currentDomainIndex ? '#BBF7D0' : 'var(--border)',
                  background: i === currentDomainIndex ? 'var(--accent-light)' : i < currentDomainIndex ? '#F0FDF4' : 'transparent',
                  color: i === currentDomainIndex ? 'var(--accent)' : i < currentDomainIndex ? '#166534' : 'var(--text-tertiary)',
                  cursor: 'pointer', transition: 'all 0.2s ease'
                }}
              >
                <span style={{
                  width: 18, height: 18, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 600,
                  background: i === currentDomainIndex ? 'var(--accent)' : i < currentDomainIndex ? '#22C55E' : 'var(--bg-tertiary)',
                  color: i === currentDomainIndex || i < currentDomainIndex ? '#fff' : 'var(--text-tertiary)'
                }}>
                  {i < currentDomainIndex ? '\u2713' : d.icon}
                </span>
                <span className="hidden sm:inline">{d.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px 120px' }}>
        <div className="animate-fade-in" key={currentDomain} style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
            {currentDomainData.name}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
            {currentDomainData.description}
          </p>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 12,
            padding: '10px 16px', borderRadius: 'var(--radius-full)',
            background: 'var(--bg-tertiary)', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500
          }}>
            <span>{ratedCount}/{componentCount} components rated</span>
            {focusMode && (
              <>
                <span style={{ color: 'var(--border)' }}>•</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Eye style={{ width: 14, height: 14 }} />
                  Focus Mode
                </span>
              </>
            )}
          </div>
        </div>

        {/* Components */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {Object.entries(currentDomainData.components).map(([code, component], compIdx) => {
            const rating = RATINGS.find(r => r.value === ratings[code])
            const showReflection = shouldShowReflection(code)
            const isExpanded = expandedExamples[code]

            return (
              <div
                key={code}
                className="animate-slide-up"
                style={{
                  animationDelay: `${compIdx * 60}ms`,
                  animationFillMode: 'both',
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-light)',
                  boxShadow: 'var(--shadow-sm)',
                  overflow: 'hidden',
                  transition: 'box-shadow 0.2s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
              >
                {/* Header */}
                <div style={{
                  padding: '20px 24px',
                  borderBottom: '1px solid var(--border-light)',
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, color: 'var(--accent)',
                        background: 'var(--accent-light)', padding: '3px 10px',
                        borderRadius: 'var(--radius-sm)', letterSpacing: '0.04em'
                      }}>
                        {code}
                      </span>
                      {rating && (
                        <span style={{
                          fontSize: 11, fontWeight: 600,
                          background: rating.bg, color: rating.text,
                          border: `1px solid ${rating.border}`,
                          padding: '3px 10px', borderRadius: 'var(--radius-full)'
                        }}>
                          {rating.label}
                        </span>
                      )}
                    </div>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                      {component.name}
                    </h3>
                  </div>
                </div>

                {/* Subcomponents */}
                {component.subcomponents && (
                  <div style={{ padding: '12px 24px', background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {component.subcomponents.map((sub, idx) => (
                        <span key={idx} style={{
                          fontSize: 12, color: 'var(--text-secondary)',
                          background: 'var(--bg-secondary)',
                          padding: '4px 10px', borderRadius: 'var(--radius-full)',
                          border: '1px solid var(--border-light)'
                        }}>
                          {sub}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rating selector */}
                <div style={{ padding: '16px 24px 12px', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-primary)' }}>
                  <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 10, letterSpacing: '0.02em' }}>
                    PERFORMANCE LEVEL
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {RATINGS.map(r => (
                      <button
                        key={r.value}
                        onClick={() => handleRatingChange(code, r.value)}
                        style={{
                          flex: 1, padding: '10px 8px',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                          borderRadius: 'var(--radius-md)',
                          border: '2px solid',
                          borderColor: ratings[code] === r.value ? r.border : 'var(--border)',
                          background: ratings[code] === r.value ? r.bg : 'var(--bg-secondary)',
                          color: ratings[code] === r.value ? r.text : 'var(--text-secondary)',
                          fontSize: 11, fontWeight: ratings[code] === r.value ? 600 : 400,
                          cursor: 'pointer', transition: 'all 0.15s ease',
                          transform: ratings[code] === r.value ? 'scale(1.02)' : 'scale(1)'
                        }}
                        onMouseEnter={e => { if (ratings[code] !== r.value) { e.currentTarget.style.borderColor = r.border; e.currentTarget.style.background = r.bg } }}
                        onMouseLeave={e => { if (ratings[code] !== r.value) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-secondary)' } }}
                      >
                        <span style={{
                          width: 24, height: 24, borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 700,
                          background: ratings[code] === r.value ? r.dot : 'var(--bg-tertiary)',
                          color: ratings[code] === r.value ? '#fff' : 'var(--text-tertiary)',
                          transition: 'all 0.15s ease'
                        }}>
                          {r.shortLabel}
                        </span>
                        <span>{r.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Prompts and responses */}
                {showReflection && (
                  <div style={{ padding: '20px 24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                      {component.prompts.map((prompt, idx) => {
                        const responseKey = `${code}_${idx}`
                        const promptData = typeof prompt === 'string' ? { question: prompt } : prompt

                        return (
                          <div key={idx}>
                            {/* Example collapsible */}
                            {promptData.example && (
                              <div style={{ marginBottom: 16 }}>
                                <button
                                  onClick={() => toggleExample(code)}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '10px 12px',
                                    background: 'var(--bg-primary)',
                                    border: '1px solid var(--border-light)',
                                    borderRadius: 'var(--radius-md)',
                                    cursor: 'pointer', transition: 'all 0.2s ease',
                                    width: '100%'
                                  }}
                                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-secondary)' }}
                                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-primary)' }}
                                >
                                  <Eye style={{ width: 14, height: 14, color: 'var(--text-tertiary)' }} />
                                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>
                                    {isExpanded ? 'Hide' : 'Show'} Proficient Response
                                  </span>
                                </button>
                                {isExpanded && (
                                  <div style={{
                                    marginTop: 10,
                                    padding: '12px 16px',
                                    background: 'var(--accent-light)',
                                    border: `1px solid var(--accent)`,
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: 13, color: 'var(--accent)', lineHeight: 1.6,
                                    fontStyle: 'italic'
                                  }}>
                                    {promptData.example}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Question */}
                            <label style={{
                              display: 'block', fontSize: 14, fontWeight: 500,
                              color: 'var(--text-primary)', marginBottom: 10,
                              lineHeight: 1.5
                            }}>
                              {promptData.question}
                            </label>

                            {/* Sentence starters */}
                            {promptData.starters && (
                              <div style={{
                                marginBottom: 12,
                                padding: '10px 12px',
                                background: 'var(--bg-primary)',
                                border: '1px dashed var(--border-light)',
                                borderRadius: 'var(--radius-md)',
                                fontSize: 12, color: 'var(--text-secondary)'
                              }}>
                                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 6 }}>
                                  Sentence Starters
                                </p>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                  {promptData.starters.map((starter, sidx) => (
                                    <li key={sidx} style={{ marginBottom: sidx < promptData.starters.length - 1 ? 4 : 0 }}>
                                      {starter}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Response field */}
                            <textarea
                              value={responses[responseKey] || ''}
                              onChange={(e) => handleResponseChange(responseKey, e.target.value)}
                              placeholder="Share specific examples from your practice..."
                              rows={3}
                              style={{
                                width: '100%', padding: '12px 16px',
                                background: 'var(--bg-primary)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-md)',
                                fontSize: 14, color: 'var(--text-primary)',
                                lineHeight: 1.6, resize: 'vertical',
                                outline: 'none', transition: 'all 0.2s ease',
                                minHeight: 80
                              }}
                              onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = 'var(--shadow-focus)'; e.target.style.background = 'var(--bg-secondary)' }}
                              onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'var(--bg-primary)' }}
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            marginTop: 20, padding: '14px 18px',
            background: '#FEF2F2', border: '1px solid #FECACA',
            borderRadius: 'var(--radius-md)',
            fontSize: 14, color: '#991B1B'
          }}>
            {error}
          </div>
        )}

        {/* Navigation */}
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'rgba(247, 248, 245, 0.9)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderTop: '1px solid var(--border-light)',
          padding: '16px 24px', zIndex: 40
        }}>
          <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              onClick={handlePrevious}
              disabled={currentDomainIndex === 0}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 20px', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500,
                cursor: currentDomainIndex === 0 ? 'not-allowed' : 'pointer',
                opacity: currentDomainIndex === 0 ? 0.4 : 1,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => { if (currentDomainIndex > 0) e.currentTarget.style.background = 'var(--bg-tertiary)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <ChevronLeft style={{ width: 16, height: 16 }} />
              Previous
            </button>

            {currentDomainIndex === domains.length - 1 ? (
              <button
                onClick={handleCompleteAssessment}
                disabled={saving}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 28px', borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: saving ? 'var(--bg-tertiary)' : 'var(--accent)',
                  color: saving ? 'var(--text-tertiary)' : '#fff',
                  fontSize: 14, fontWeight: 600,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={e => { if (!saving) e.currentTarget.style.background = 'var(--accent-hover)' }}
                onMouseLeave={e => { if (!saving) e.currentTarget.style.background = 'var(--accent)' }}
              >
                {saving ? <Loader style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> : <Save style={{ width: 16, height: 16 }} />}
                Complete Assessment
              </button>
            ) : (
              <button
                onClick={handleNext}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '10px 28px', borderRadius: 'var(--radius-md)',
                  border: 'none', background: 'var(--accent)',
                  color: '#fff', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.2s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}
              >
                Next Domain
                <ChevronRight style={{ width: 16, height: 16 }} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
