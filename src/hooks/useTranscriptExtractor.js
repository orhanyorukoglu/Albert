import { useState } from 'react'
import { extractTranscript } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { getFormattedContent } from '../utils/formatters'

const PLACEHOLDER_TEXT = 'This video is restricted and does not allow transcript extraction'

/**
 * Check if the transcript consists entirely of placeholder text
 * (backend returns metadata with this text when extraction fails)
 */
function isPlaceholder(transcript) {
  if (!transcript) return false
  const segments = transcript.segments || []
  if (segments.length === 0) return false
  const fullText = segments.map(s => s.text).join(' ').trim()
  return fullText === PLACEHOLDER_TEXT
}

/**
 * Check if API response has valid transcript data
 */
function hasValidTranscriptData(result) {
  if (!result) return false

  // Check for transcripts wrapper (multi-language response)
  if (result.transcripts && Object.keys(result.transcripts).length > 0) {
    // Verify at least one transcript has segments
    return Object.values(result.transcripts).some(
      t => t.segments && t.segments.length > 0
    )
  }

  // Check for direct segments/transcript/full_text
  if (result.segments && result.segments.length > 0) return true
  if (result.transcript && result.transcript.length > 0) return true
  if (result.full_text && result.full_text.length > 0) return true

  return false
}

/**
 * Custom hook to manage transcript extraction state and logic
 * @returns {Object} State and handlers for transcript extraction
 */
export function useTranscriptExtractor() {
  const { getAccessToken } = useAuth()

  // Status: 'idle' | 'loading' | 'success' | 'error'
  const [status, setStatus] = useState('idle')

  // Input state
  const [url, setUrl] = useState('')
  const [format, setFormat] = useState('txt')

  // Transcript state
  const [transcript, setTranscript] = useState(null)
  const [allTranscripts, setAllTranscripts] = useState(null)
  const [availableLanguages, setAvailableLanguages] = useState([])
  const [selectedLanguage, setSelectedLanguage] = useState('en')

  // Video metadata state
  const [videoId, setVideoId] = useState(null)
  const [thumbnailUrl, setThumbnailUrl] = useState(null)
  const [videoMetadata, setVideoMetadata] = useState(null)

  // Saved transcript state (when authenticated)
  const [transcriptId, setTranscriptId] = useState(null)
  const [isSaved, setIsSaved] = useState(false)

  // Error state
  const [error, setError] = useState(null)
  const [errorType, setErrorType] = useState(null)

  /**
   * Reset all state to initial values
   */
  const reset = () => {
    setStatus('idle')
    setTranscript(null)
    setAllTranscripts(null)
    setAvailableLanguages([])
    setSelectedLanguage('en')
    setVideoId(null)
    setThumbnailUrl(null)
    setVideoMetadata(null)
    setTranscriptId(null)
    setIsSaved(false)
    setError(null)
    setErrorType(null)
  }

  /**
   * Handle URL input change
   */
  const handleUrlChange = (newUrl) => {
    setUrl(newUrl)
    // Reset state when URL changes
    if (newUrl !== url) {
      reset()
    }
  }

  /**
   * Handle format change
   */
  const handleFormatChange = (newFormat) => {
    setFormat(newFormat)
  }

  /**
   * Handle language change (instant switch from cached data)
   */
  const handleLanguageChange = (langCode, isGenerated) => {
    setSelectedLanguage(langCode)
    if (allTranscripts) {
      const transcriptData = allTranscripts[langCode] ||
        Object.entries(allTranscripts).find(([key]) => key.startsWith(langCode))?.[1]

      if (transcriptData) {
        setTranscript({
          ...transcriptData,
          language: langCode,
        })
      }
    }
  }

  /**
   * Get copy content based on current format
   */
  const getCopyContent = () => {
    return getFormattedContent(transcript, format)
  }

  /**
   * Submit URL and extract transcript (single request, no retries —
   * the backend already tries multiple extraction methods internally)
   */
  const handleSubmit = async () => {
    setStatus('loading')
    setError(null)
    setErrorType(null)
    setTranscript(null)
    setAllTranscripts(null)
    setThumbnailUrl(null)
    setVideoMetadata(null)
    setTranscriptId(null)
    setIsSaved(false)

    let result
    try {
      result = await extractTranscript(url, format, {}, getAccessToken)
    } catch (err) {
      const errorMessage = err.message || 'An unexpected error occurred.'
      setError(errorMessage)

      const isNotFoundError = err.status === 404 ||
        errorMessage.toLowerCase().includes('no transcript available') ||
        errorMessage.toLowerCase().includes('transcripts are disabled') ||
        errorMessage.toLowerCase().includes('no transcript found')

      const isValidationError = err.status === 400 ||
        err.status === 422 ||
        errorMessage.toLowerCase().includes('invalid youtube url') ||
        errorMessage.toLowerCase().includes('invalid') ||
        errorMessage.toLowerCase().includes('validation error')

      setErrorType(isNotFoundError ? 'not_found' : isValidationError ? 'validation' : 'server')
      setStatus('error')
      return
    }

    if (!result) return

    // Check if response has valid transcript data
    if (!hasValidTranscriptData(result)) {
      setError('No transcript data returned. The video may not have captions available.')
      setErrorType('not_found')
      setStatus('error')
      return
    }

    // Store all transcripts for instant language switching
    const hasTranscripts = result.transcripts && Object.keys(result.transcripts).length > 0

    if (hasTranscripts) {
      setAllTranscripts(result.transcripts)

      // Find the best English option or fall back to first available
      const availableCodes = Object.keys(result.transcripts)
      const findEnglish = () => {
        // Try exact 'en' first, then any English variant (en-US, en-GB, etc.)
        if (result.transcripts['en']) return 'en'
        const englishVariant = availableCodes.find(code => code.startsWith('en'))
        return englishVariant || null
      }

      const defaultLang = result.default_language
      const englishLang = findEnglish()

      // Prefer: 1) English if available, 2) API default, 3) first available
      const langToUse = englishLang || (defaultLang && result.transcripts[defaultLang] ? defaultLang : availableCodes[0])
      setSelectedLanguage(langToUse)

      // Build transcript object for display from the selected language
      const selectedTranscript = result.transcripts[langToUse]
      setTranscript({
        ...selectedTranscript,
        language: langToUse,
        video_id: result.video_id,
      })

      // Build available languages from transcripts dict if not provided separately
      if (result.available_languages && result.available_languages.length > 0) {
        // Deduplicate by code, keeping first occurrence
        const seen = new Set()
        const uniqueLangs = result.available_languages.filter(lang => {
          if (seen.has(lang.code)) return false
          seen.add(lang.code)
          return true
        })
        setAvailableLanguages(uniqueLangs)
      } else {
        const langs = Object.entries(result.transcripts).map(([code, data]) => ({
          code,
          name: data.name,
          is_generated: data.is_generated,
        }))
        setAvailableLanguages(langs)
      }
    } else if (result.segments || result.transcript || result.full_text) {
      // Fallback: Handle response without transcripts wrapper
      setTranscript(result)
    }

    // Extract metadata from the response
    if (result.video_id) {
      setVideoId(result.video_id)
    }
    if (result.thumbnail_url) {
      setThumbnailUrl(result.thumbnail_url)
    }
    if (result.video_title || result.channel_name || result.duration_seconds) {
      setVideoMetadata({
        title: result.video_title,
        channel: result.channel_name,
        channel_id: result.channel_id,
        description: result.description,
        duration_seconds: result.duration_seconds,
        view_count: result.view_count,
        upload_date: result.upload_date,
        is_short: result.is_short,
        is_live: result.is_live,
      })
    }

    // Capture saved transcript info (when authenticated)
    if (result.transcript_id) {
      setTranscriptId(result.transcript_id)
      setIsSaved(true)
    }
    if (result.saved !== undefined) {
      setIsSaved(result.saved)
    }

    setStatus('success')
  }

  /**
   * Clear error state
   */
  const clearError = () => {
    setError(null)
    setErrorType(null)
    if (status === 'error') {
      setStatus('idle')
    }
  }

  return {
    // Status
    status,
    isLoading: status === 'loading',
    isSuccess: status === 'success',
    isError: status === 'error',
    isIdle: status === 'idle',

    // Input
    url,
    format,

    // Transcript data
    transcript,
    isPlaceholderTranscript: isPlaceholder(transcript),
    availableLanguages,
    selectedLanguage,

    // Video metadata
    videoId,
    thumbnailUrl,
    videoMetadata,

    // Saved transcript info (when authenticated)
    transcriptId,
    isSaved,

    // Error state
    error,
    errorType,

    // Handlers
    handleUrlChange,
    handleFormatChange,
    handleLanguageChange,
    handleSubmit,
    getCopyContent,
    clearError,
    reset,
  }
}
