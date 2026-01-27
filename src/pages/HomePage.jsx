import { useState } from 'react'
import { extractTranscript, getThumbnail, getMetadata } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import UrlInput from '../components/UrlInput'
import FormatSelector from '../components/FormatSelector'
import TranscriptDisplay from '../components/TranscriptDisplay'
import CopyButton from '../components/CopyButton'
import DownloadButton from '../components/DownloadButton'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorPopup from '../components/ErrorPopup'
import DiagnosticSidebar from '../components/DiagnosticSidebar'
import LanguageSelector from '../components/LanguageSelector'
import ApiEnvironmentSwitcher from '../components/ApiEnvironmentSwitcher'
import UserMenu from '../components/UserMenu'

const TESTING_MODE = import.meta.env.VITE_TESTING_MODE === 'yes'

export default function HomePage() {
  const { getAccessToken } = useAuth()
  const [url, setUrl] = useState('')
  const [format, setFormat] = useState('txt')
  const [transcript, setTranscript] = useState(null)
  const [allTranscripts, setAllTranscripts] = useState(null) // Stores all language transcripts
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState(null)
  const [errorType, setErrorType] = useState(null)
  const [retryInfo, setRetryInfo] = useState(null)
  const [showErrorPopup, setShowErrorPopup] = useState(false)
  const [availableLanguages, setAvailableLanguages] = useState([])
  const [selectedLanguage, setSelectedLanguage] = useState('en')
  const [thumbnailUrl, setThumbnailUrl] = useState(null)
  const [videoMetadata, setVideoMetadata] = useState(null)

  // Helper to format time for SRT/VTT
  const formatTime = (seconds, forVtt = false) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.round((seconds % 1) * 1000)
    const separator = forVtt ? '.' : ','
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}${separator}${String(ms).padStart(3, '0')}`
  }

  // Convert segments to SRT format
  const segmentsToSrt = (segments) => {
    return segments.map((seg, i) => {
      const start = formatTime(seg.start)
      const end = formatTime(seg.end || seg.start + seg.duration)
      return `${i + 1}\n${start} --> ${end}\n${seg.text}\n`
    }).join('\n')
  }

  // Convert segments to VTT format
  const segmentsToVtt = (segments) => {
    const cues = segments.map((seg) => {
      const start = formatTime(seg.start, true)
      const end = formatTime(seg.end || seg.start + seg.duration, true)
      return `${start} --> ${end}\n${seg.text}\n`
    }).join('\n')
    return `WEBVTT\n\n${cues}`
  }

  // Convert segments to plain text
  const segmentsToText = (segments) => {
    return segments.map(seg => seg.text).join(' ')
  }

  const getCopyContent = () => {
    if (!transcript) return null

    // Handle legacy format (string response)
    if (typeof transcript === 'string') {
      return format === 'txt' ? transcript.replace(/\n+/g, ' ').trim() : transcript
    }

    // Handle legacy format with format-specific content
    if (format === 'srt' && transcript.srt_content) return transcript.srt_content
    if (format === 'vtt' && transcript.vtt_content) return transcript.vtt_content
    if (format === 'txt' && (transcript.full_text || transcript.txt_content || transcript.transcript)) {
      const text = transcript.full_text || transcript.txt_content || transcript.transcript || ''
      return text.replace(/\n+/g, ' ').trim()
    }

    // Handle new segments-based format
    if (transcript.segments) {
      switch (format) {
        case 'srt':
          return segmentsToSrt(transcript.segments)
        case 'vtt':
          return segmentsToVtt(transcript.segments)
        case 'txt':
          return segmentsToText(transcript.segments)
        case 'json':
        default:
          return JSON.stringify(transcript, null, 2)
      }
    }

    return JSON.stringify(transcript, null, 2)
  }

  const handleSubmit = async () => {
    setLoading(true)
    setApiError(null)
    setErrorType(null)
    setRetryInfo(null)
    setTranscript(null)
    setAllTranscripts(null)
    setThumbnailUrl(null)
    setVideoMetadata(null)

    try {
      // All languages are returned by default - no need to specify fetchAllLanguages
      const result = await extractTranscript(url, format, {}, (retry) => {
        // Update retry info for sidebar display
        setRetryInfo(retry)
      }, getAccessToken)
      setRetryInfo(null)

      // Store all transcripts for instant language switching
      const hasTranscripts = result.transcripts && Object.keys(result.transcripts).length > 0

      if (hasTranscripts) {
        setAllTranscripts(result.transcripts)

        // Set default language from API or fallback to first available
        const defaultLang = result.default_language || 'en'
        const langToUse = result.transcripts[defaultLang] ? defaultLang : Object.keys(result.transcripts)[0]
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
          setAvailableLanguages(result.available_languages)
        } else {
          // Build from transcripts keys
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
      } else {
        // No transcript data - show error
        console.error('API Response has no transcript data:', result)
        setApiError('No transcript data returned. The video may not have captions available.')
        setErrorType('server')
        setShowErrorPopup(true)
      }

      // Fetch thumbnail and metadata in parallel
      const [thumbnailResult, metadataResult] = await Promise.all([
        getThumbnail(url).catch(() => null),
        getMetadata(url).catch(() => null),
      ])

      if (thumbnailResult?.thumbnail_url) {
        setThumbnailUrl(thumbnailResult.thumbnail_url)
      }
      if (metadataResult) {
        setVideoMetadata(metadataResult)
      }
    } catch (err) {
      setRetryInfo(null)
      const errorMessage = err.message || 'An unexpected error occurred.'
      setApiError(errorMessage)

      // Determine error type for appropriate UI treatment
      const isValidationError = err.status === 400 ||
        err.status === 422 ||
        errorMessage.toLowerCase().includes('invalid youtube url') ||
        errorMessage.toLowerCase().includes('invalid') ||
        errorMessage.toLowerCase().includes('validation error')

      setErrorType(isValidationError ? 'validation' : 'server')
      setShowErrorPopup(true)
    } finally {
      setLoading(false)
    }
  }

  const handleLanguageChange = (langCode, isGenerated) => {
    setSelectedLanguage(langCode)
    // Switch transcript instantly from cached data (no API call needed)
    if (allTranscripts) {
      // Try exact match first, then try with language code only
      const transcript = allTranscripts[langCode] ||
        Object.entries(allTranscripts).find(([key]) => key.startsWith(langCode))?.[1]

      if (transcript) {
        setTranscript({
          ...transcript,
          language: langCode,
        })
      }
    }
  }

  const handleUrlChange = (newUrl) => {
    setUrl(newUrl)
    // Reset state when URL changes
    if (newUrl !== url) {
      setAvailableLanguages([])
      setSelectedLanguage('en')
      setAllTranscripts(null)
      setThumbnailUrl(null)
      setVideoMetadata(null)
    }
  }

  return (
    <div className="flex min-h-screen">
      {TESTING_MODE && <DiagnosticSidebar apiError={apiError} retryInfo={retryInfo} />}
      <ErrorPopup
        error={showErrorPopup ? apiError : null}
        errorType={errorType}
        onClose={() => setShowErrorPopup(false)}
      />

      <div className="flex-1 bg-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-8">
          {/* Header with environment switcher and user menu */}
          <div className="flex justify-between items-center mb-4">
            {TESTING_MODE ? (
              <ApiEnvironmentSwitcher />
            ) : (
              <div />
            )}
            <UserMenu />
          </div>

          <h1 className="text-2xl font-bold text-center mb-8">
            Albert - YouTube Transcript Extractor
          </h1>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <UrlInput
              value={url}
              onChange={handleUrlChange}
              onSubmit={handleSubmit}
              disabled={loading}
            />

            <div className="mt-4">
              <FormatSelector
                value={format}
                onChange={setFormat}
                disabled={loading}
              />
            </div>

            {loading && <LoadingSpinner />}

            {transcript && !loading && (
              <>
                {(thumbnailUrl || videoMetadata) && (
                  <div className="mt-6 flex gap-4">
                    {thumbnailUrl && (
                      <img
                        src={thumbnailUrl}
                        alt="Video thumbnail"
                        className="rounded-lg shadow-sm w-48 h-auto flex-shrink-0"
                      />
                    )}
                    {videoMetadata && (
                      <div className="text-sm text-gray-600 space-y-1">
                        {videoMetadata.title && (
                          <p className="font-medium text-gray-900 line-clamp-2">{videoMetadata.title}</p>
                        )}
                        {videoMetadata.channel && (
                          <p className="text-gray-500">{videoMetadata.channel}</p>
                        )}
                        {videoMetadata.duration && (
                          <p className="text-gray-400">Duration: {videoMetadata.duration}</p>
                        )}
                        {videoMetadata.view_count && (
                          <p className="text-gray-400">{Number(videoMetadata.view_count).toLocaleString()} views</p>
                        )}
                        {videoMetadata.upload_date && (
                          <p className="text-gray-400">Uploaded: {videoMetadata.upload_date}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {availableLanguages.length > 1 && (
                  <LanguageSelector
                    languages={availableLanguages}
                    selectedLanguage={selectedLanguage}
                    onChange={handleLanguageChange}
                    disabled={loading}
                  />
                )}
                <div className="mt-6 flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-900">Transcript</h2>
                  <div className="flex gap-2">
                    <CopyButton text={getCopyContent()} disabled={loading} />
                    <DownloadButton content={getCopyContent()} format={format} disabled={loading} />
                  </div>
                </div>
                <TranscriptDisplay transcript={transcript} format={format} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
