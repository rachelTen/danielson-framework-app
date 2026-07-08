import React, { useState } from 'react'
import { frameworkData } from '../data/framework'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { ChevronRight, ChevronLeft, Save, Loader, CircleCheck as CheckCircle, Download, Sparkles } from 'lucide-react'
import QuestionSupport from './QuestionSupport'
import { promptSupport } from '../data/promptSupport'

const RATINGS = [
  { value: 'unsatisfactory', label: 'Unsatisfactory', shortLabel: 'U', score: 1, bg: '#FEF2F2', border: '#FECACA', text: '#991B1B', dot: '#EF4444' },
  { value: 'basic', label: 'Basic', shortLabel: 'B', score: 2, bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', dot: '#F59E0B' },
  { value: 'proficient', label: 'Proficient', shortLabel: 'P', score: 3, bg: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF', dot: '#3B82F6' },
  { value: 'distinguished', label: 'Distinguished', shortLabel: 'D', score: 4, bg: '#F0FDF4', border: '#BBF7D0', text: '#166534', dot: '#22C55E' }
]

export default function AssessmentWizard({ onComplete }) {
  const { user } = useAuth()
  const [currentDomain, setCurrentDomain] = useState('domain1')
  const [assessmentTitle, setAssessmentTitle] = useState('')
  const [responses, setResponses] = useState({})
  const [ratings, setRatings] = useState({})
  const [saving, setSaving] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [error, setError] = useState('')
  const [savedAssessmentId, setSavedAssessmentId] = useState(null)
  const [downloadError, setDownloadError] = useState('')

  const domains = [
    { key: 'domain1', label: 'Planning & Preparation', icon: '1', step: 1 },
    { key: 'domain2', label: 'Classroom Environment', icon: '2', step: 2 },
    { key: 'domain3', label: 'Instruction', icon: '3', step: 3 },
    { key: 'domain4', label: 'Professional Responsibilities', icon: '4', step: 4 }
  ]

  const currentDomainData = frameworkData[currentDomain]
  const currentDomainIndex = domains.findIndex(d => d.key === currentDomain)

  const handleResponseChange = (responseKey, value) => {
    setResponses(prev => ({ ...prev, [responseKey]: value }))
  }

  const handleRatingChange = (componentCode, rating) => {
    setRatings(prev => ({ ...prev, [componentCode]: rating }))
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

  const handleSaveAssessment = async () => {
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
          domain_1_notes: '',
          domain_2_notes: '',
          domain_3_notes: '',
          domain_4_notes: '',
          overall_notes: '',
          is_completed: true,
          completed_at: new Date().toISOString()
        })
        .select()
        .maybeSingle()

      if (assessmentError) throw assessmentError

      const responsesToInsert = Object.entries(responses).map(([responseKey, responseText]) => {
        const componentCode = responseKey.split('_')[0]
        const domainNum = parseInt(componentCode.charAt(0))
        const domainKey = `domain${domainNum}`
        const componentName = frameworkData[domainKey]?.components[componentCode]?.name || componentCode
        const rating = ratings[componentCode] || null

        return {
          assessment_id: assessment.id,
          component_code: componentCode,
          component_name: componentName,
          domain_number: domainNum,
          response_text: responseText,
          rating
        }
      })

      // Ensure rated components with no text response are also saved
      Object.entries(ratings).forEach(([componentCode, ratingValue]) => {
        const alreadyHasEntry = responsesToInsert.some(r => r.component_code === componentCode)
        if (!alreadyHasEntry) {
          const domainNum = parseInt(componentCode.charAt(0))
          const domainKey = `domain${domainNum}`
          const componentName = frameworkData[domainKey]?.components[componentCode]?.name || componentCode
          responsesToInsert.push({
            assessment_id: assessment.id,
            component_code: componentCode,
            component_name: componentName,
            domain_number: domainNum,
            response_text: '',
            rating: ratingValue
          })
        }
      })

      if (responsesToInsert.length > 0) {
        const { error: responsesError } = await supabase
          .from('assessment_responses')
          .insert(responsesToInsert)
        if (responsesError) throw responsesError
      }

      setSavedAssessmentId(assessment.id)
      setCompleted(true)
    } catch (err) {
      setError(err.message || 'Failed to save assessment')
    } finally {
      setSaving(false)
    }
  }

  const generateAssessmentContent = () => {
    const lines = [
      'DANIELSON FRAMEWORK SELF-ASSESSMENT',
      '=====================================',
      `Title: ${assessmentTitle}`,
      `Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
      '',
      ''
    ]

    domains.forEach(d => {
      const domainData = frameworkData[d.key]
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
          lines.push(`  Q: ${prompt}`)
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

  const handleDownloadTXT = async () => {
    try {
      setDownloadError('')
      const lines = generateAssessmentContent()
      const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${assessmentTitle.replace(/\s+/g, '-').toLowerCase()}-assessment.txt`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('TXT download failed:', err)
      setDownloadError('Failed to download TXT file. Please try again.')
    }
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
      setDownloadError('Failed to download PDF file. Please try again.')
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
      setDownloadError('Failed to download DOCX file. Please try again.')
    }
  }

  const handleDownload = (format) => {
    switch (format) {
      case 'pdf':
        handleDownloadPDF()
        break
      case 'docx':
        handleDownloadDOCX()
        break
      case 'txt':
      default:
        handleDownloadTXT()
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

  if (completed) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{
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
            <button
              onClick={() => handleDownload('txt')}
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
              Download as TXT
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

  const progressPct = ((currentDomainIndex + 1) / domains.length) * 100
  const domainAvg = calculateDomainAverage(currentDomain)
  const domainAvgRating = getAverageRating(domainAvg)

  const componentCount = Object.keys(currentDomainData.components).length
  const ratedCount = Object.entries(ratings).filter(([k]) => k.startsWith(currentDomain.replace('domain', ''))).length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Header with progress */}
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
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>
              {Math.round(progressPct)}% complete
            </span>
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
                  fontSize: 13, fontWeight: i === currentDomainIndex ? 600 : 400,
                  border: '1px solid',
                  borderColor: i === currentDomainIndex ? 'var(--accent)' : i < currentDomainIndex ? '#BBF7D0' : 'var(--border)',
                  background: i === currentDomainIndex ? 'var(--accent-light)' : i < currentDomainIndex ? '#F0FDF4' : 'transparent',
                  color: i === currentDomainIndex ? 'var(--accent)' : i < currentDomainIndex ? '#166534' : 'var(--text-tertiary)',
                  cursor: 'pointer', transition: 'all 0.2s ease'
                }}
              >
                <span style={{
                  width: 20, height: 20, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 600,
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
        {/* Title section (only on first domain) */}
        {currentDomainIndex === 0 && (
          <div style={{ marginBottom: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <Sparkles style={{ width: 20, height: 20, color: 'var(--accent)' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Self-Assessment
              </span>
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, lineHeight: 1.2 }}>
              Charlotte Danielson Framework
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.7, maxWidth: 560, marginBottom: 28 }}>
              Reflect on your teaching practice across four domains. For each component, share specific examples from your work and rate your current performance level.
            </p>
            <div style={{ maxWidth: 420 }}>
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
                  outline: 'none', transition: 'all 0.2s ease',
                  boxShadow: 'var(--shadow-sm)'
                }}
                onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = 'var(--shadow-focus)' }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'var(--shadow-sm)' }}
              />
            </div>
          </div>
        )}

        {/* Domain header */}
        <div key={currentDomain} style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
            {currentDomainData.name}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
            {currentDomainData.description}
          </p>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            marginTop: 12, padding: '6px 14px', borderRadius: 'var(--radius-full)',
            background: 'var(--bg-tertiary)', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500
          }}>
            {ratedCount}/{componentCount} components rated
          </div>
        </div>

        {/* Components */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {Object.entries(currentDomainData.components).map(([code, component], compIdx) => {
            const rating = RATINGS.find(r => r.value === ratings[code])
            return (
              <div
                key={code}
                style={{
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
                {/* Component header */}
                <div style={{
                  padding: '20px 24px 16px',
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                  borderBottom: '1px solid var(--border-light)'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, color: 'var(--accent)',
                        background: 'var(--accent-light)', padding: '2px 8px',
                        borderRadius: 'var(--radius-sm)', letterSpacing: '0.04em'
                      }}>
                        {code}
                      </span>
                      {rating && (
                        <span style={{
                          fontSize: 11, fontWeight: 600,
                          background: rating.bg, color: rating.text,
                          border: `1px solid ${rating.border}`,
                          padding: '2px 10px', borderRadius: 'var(--radius-full)'
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
                {component.subcomponents && component.subcomponents.length > 0 && (
                  <div style={{ padding: '12px 24px', background: 'var(--bg-primary)' }}>
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

                {/* Prompts */}
                <div style={{ padding: '20px 24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {component.prompts && component.prompts.map((prompt, idx) => {
                      const responseKey = `${code}_${idx}`
                      const support = promptSupport[code]?.[idx]
                      return (
                        <div key={idx}>
                          <label style={{
                            display: 'block', fontSize: 14, fontWeight: 400,
                            color: 'var(--text-primary)', marginBottom: 10,
                            lineHeight: 1.6
                          }}>
                            {prompt}
                          </label>
                          {support && (
                            <QuestionSupport example={support.example} starters={support.starters} />
                          )}
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

                {/* Rating selector */}
                <div style={{
                  padding: '16px 24px 20px',
                  borderTop: '1px solid var(--border-light)',
                  background: 'var(--bg-primary)'
                }}>
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
              </div>
            )
          })}
        </div>

        {/* Domain summary */}
        <div style={{
          marginTop: 32, padding: 24,
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>
            Domain Overview
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {domains.map(d => {
              const avg = calculateDomainAverage(d.key)
              const avgR = getAverageRating(avg)
              return (
                <div key={d.key} style={{
                  padding: 14, borderRadius: 'var(--radius-md)',
                  background: avgR ? avgR.bg : 'var(--bg-primary)',
                  border: `1px solid ${avgR ? avgR.border : 'var(--border-light)'}`,
                  textAlign: 'center', transition: 'all 0.3s ease'
                }}>
                  <p style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500, marginBottom: 6 }}>
                    D{d.icon}
                  </p>
                  <p style={{
                    fontSize: 13, fontWeight: 600,
                    color: avgR ? avgR.text : 'var(--text-tertiary)'
                  }}>
                    {avgR ? avgR.label : 'Not rated'}
                  </p>
                  {avg && (
                    <p style={{ fontSize: 11, color: avgR ? avgR.text : 'var(--text-tertiary)', marginTop: 2, opacity: 0.7 }}>
                      {avg.toFixed(1)} / 4.0
                    </p>
                  )}
                </div>
              )
            })}
          </div>
          {domainAvg && (
            <div style={{
              marginTop: 16, padding: '12px 16px',
              background: domainAvgRating ? domainAvgRating.bg : 'var(--bg-primary)',
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${domainAvgRating ? domainAvgRating.border : 'var(--border)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: domainAvgRating ? domainAvgRating.text : 'var(--text-secondary)' }}>
                Current Domain Average
              </span>
              <span style={{ fontSize: 15, fontWeight: 700, color: domainAvgRating ? domainAvgRating.text : 'var(--text-secondary)' }}>
                {domainAvgRating.label} ({domainAvg.toFixed(1)})
              </span>
            </div>
          )}
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
                onClick={handleSaveAssessment}
                disabled={saving || !assessmentTitle}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 28px', borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: saving || !assessmentTitle ? 'var(--bg-tertiary)' : 'var(--accent)',
                  color: saving || !assessmentTitle ? 'var(--text-tertiary)' : '#fff',
                  fontSize: 14, fontWeight: 600,
                  cursor: saving || !assessmentTitle ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: saving || !assessmentTitle ? 'none' : '0 2px 8px rgba(91, 138, 114, 0.3)'
                }}
                onMouseEnter={e => { if (!saving && assessmentTitle) e.currentTarget.style.background = 'var(--accent-hover)' }}
                onMouseLeave={e => { if (!saving && assessmentTitle) e.currentTarget.style.background = 'var(--accent)' }}
              >
                {saving ? <Loader style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> : <Save style={{ width: 16, height: 16 }} />}
                Save Assessment
              </button>
            ) : (
              <button
                onClick={handleNext}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '10px 28px', borderRadius: 'var(--radius-md)',
                  border: 'none', background: 'var(--accent)',
                  color: '#fff', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.2s ease',
                  boxShadow: '0 2px 8px rgba(91, 138, 114, 0.3)'
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
