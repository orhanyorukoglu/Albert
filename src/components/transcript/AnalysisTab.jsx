import { useState, useEffect, useCallback, useRef } from 'react'
import { Sparkles, RefreshCw, Tag, HelpCircle, Layers, BarChart3 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { getAnalysisByTranscript, analyzeTranscript } from '../../services/api'
import { Button } from '@/components/ui/button'

const POLL_INTERVAL = 2000
const POLL_TIMEOUT = 30000

export default function AnalysisTab({ transcriptId }) {
  const { getAccessToken } = useAuth()

  // status: loading | polling | complete | manual | failed | analyzing
  const [status, setStatus] = useState('loading')
  const [analysis, setAnalysis] = useState(null)
  const [error, setError] = useState(null)
  const pollTimerRef = useRef(null)
  const pollStartRef = useRef(null)

  const clearPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }, [])

  const fetchAnalysis = useCallback(async () => {
    try {
      const data = await getAnalysisByTranscript(transcriptId, getAccessToken)
      if (data) {
        setAnalysis(data)
        setStatus('complete')
        return true
      }
      return false
    } catch (err) {
      console.error('Failed to fetch analysis:', err)
      setError(err.message)
      setStatus('failed')
      return false
    }
  }, [transcriptId, getAccessToken])

  // Initial load + polling
  useEffect(() => {
    if (!transcriptId) return

    let cancelled = false

    async function init() {
      setStatus('loading')
      setError(null)

      const found = await fetchAnalysis()
      if (cancelled) return
      if (found) return

      // Not found — start polling
      setStatus('polling')
      pollStartRef.current = Date.now()

      pollTimerRef.current = setInterval(async () => {
        if (cancelled) {
          clearPolling()
          return
        }

        const elapsed = Date.now() - pollStartRef.current
        if (elapsed >= POLL_TIMEOUT) {
          clearPolling()
          if (!cancelled) setStatus('manual')
          return
        }

        try {
          const data = await getAnalysisByTranscript(transcriptId, getAccessToken)
          if (cancelled) return
          if (data) {
            clearPolling()
            setAnalysis(data)
            setStatus('complete')
          }
        } catch {
          // Ignore polling errors, keep trying
        }
      }, POLL_INTERVAL)
    }

    init()

    return () => {
      cancelled = true
      clearPolling()
    }
  }, [transcriptId, fetchAnalysis, clearPolling, getAccessToken])

  const handleManualAnalyze = async () => {
    setStatus('analyzing')
    setError(null)
    try {
      const data = await analyzeTranscript(transcriptId, getAccessToken)
      setAnalysis(data)
      setStatus('complete')
    } catch (err) {
      console.error('Failed to analyze transcript:', err)
      setError(err.message)
      setStatus('failed')
    }
  }

  // --- Loading ---
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Checking for analysis...</p>
        </div>
      </div>
    )
  }

  // --- Polling ---
  if (status === 'polling') {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Waiting for auto-analysis...</p>
          <p className="text-xs text-gray-400 mt-1">This may be triggered automatically by the backend</p>
        </div>
      </div>
    )
  }

  // --- Analyzing (manual trigger in progress) ---
  if (status === 'analyzing') {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Analyzing transcript...</p>
          <p className="text-xs text-gray-400 mt-1">AI is classifying and extracting insights</p>
        </div>
      </div>
    )
  }

  // --- Failed ---
  if (status === 'failed') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800 mb-3">{error || 'Analysis failed'}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleManualAnalyze}
          className="gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Try Again
        </Button>
      </div>
    )
  }

  // --- Manual (polling timed out, no auto-analysis found) ---
  if (status === 'manual') {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <Sparkles className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600 mb-2">No analysis available yet</p>
        <p className="text-sm text-gray-500 mb-6">
          Generate AI-powered classification, topics, and insights for this transcript
        </p>
        <Button
          size="sm"
          onClick={handleManualAnalyze}
          className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
        >
          <Sparkles className="h-4 w-4" />
          Analyze Now
        </Button>
      </div>
    )
  }

  // --- Complete: display results ---
  const classification = analysis?.classification || {}
  const categories = analysis?.categories || []
  const topics = analysis?.topics || []
  const extractedData = analysis?.extracted_data || {}
  const suggestedQuestions = analysis?.suggested_questions || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          Analysis
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handleManualAnalyze}
          className="h-8 gap-1.5 text-xs"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Re-analyze
        </Button>
      </div>

      {/* Classification Badges */}
      {Object.keys(classification).length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4 text-gray-400" />
            Classification
          </h4>
          <div className="flex flex-wrap gap-2">
            {classification.primary_category && (
              <Badge color="blue" label="Category" value={classification.primary_category} />
            )}
            {classification.content_type && (
              <Badge color="purple" label="Type" value={classification.content_type} />
            )}
            {classification.audience_level && (
              <Badge color="green" label="Audience" value={classification.audience_level} />
            )}
            {classification.tone && (
              <Badge color="amber" label="Tone" value={classification.tone} />
            )}
            {classification.confidence_score != null && (
              <Badge
                color="gray"
                label="Confidence"
                value={`${Math.round(classification.confidence_score * 100)}%`}
              />
            )}
          </div>
        </div>
      )}

      {/* Categories & Topics */}
      {(categories.length > 0 || topics.length > 0) && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1.5">
            <Tag className="h-4 w-4 text-gray-400" />
            Categories & Topics
          </h4>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat, i) => (
              <span
                key={`cat-${i}`}
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
              >
                {cat}
              </span>
            ))}
            {topics.map((topic, i) => (
              <span
                key={`topic-${i}`}
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Extracted Data */}
      {Object.keys(extractedData).length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-gray-400" />
            Extracted Data
          </h4>
          <div className="bg-gray-50 rounded-lg border border-gray-200 divide-y divide-gray-200">
            {Object.entries(extractedData).map(([key, value]) => (
              <div key={key} className="flex items-start gap-3 px-4 py-3">
                <span className="text-sm font-medium text-gray-600 shrink-0 min-w-[120px]">
                  {formatKey(key)}
                </span>
                <span className="text-sm text-gray-900">
                  {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Questions */}
      {suggestedQuestions.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1.5">
            <HelpCircle className="h-4 w-4 text-gray-400" />
            Suggested Questions
          </h4>
          <ul className="space-y-2">
            {suggestedQuestions.map((question, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg px-4 py-3 border border-gray-200"
              >
                <span className="text-purple-500 font-medium shrink-0">Q{i + 1}.</span>
                {question}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// --- Helper components ---

function Badge({ color, label, value }) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    gray: 'bg-gray-50 text-gray-700 border-gray-200',
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${colorMap[color] || colorMap.gray}`}>
      <span className="text-[10px] uppercase tracking-wide opacity-70">{label}</span>
      {value}
    </span>
  )
}

function formatKey(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
