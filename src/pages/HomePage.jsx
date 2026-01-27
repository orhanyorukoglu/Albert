import { useState, useEffect } from 'react'
import { Settings, ArrowLeft } from 'lucide-react'
import { useTranscriptExtractor } from '../hooks/useTranscriptExtractor'
import { useAuth } from '../contexts/AuthContext'
import DiagnosticSidebar from '../components/DiagnosticSidebar'
import ApiEnvironmentSwitcher from '../components/ApiEnvironmentSwitcher'
import UserMenu from '../components/UserMenu'
import HistorySidebar from '../components/history/HistorySidebar'
import RecentExtractionsGrid from '../components/history/RecentExtractionsGrid'
import InputSection from '../components/input/InputSection'
import TranscriptResultView from '../components/transcript/TranscriptResultView'
import LoadingState from '../components/states/LoadingState'
import ErrorState from '../components/states/ErrorState'

const TESTING_MODE = import.meta.env.VITE_TESTING_MODE === 'yes'

export default function HomePage() {
  const { isAuthenticated } = useAuth()
  const [recentTranscripts, setRecentTranscripts] = useState([])

  const {
    // Status
    status,
    isLoading,
    isSuccess,
    isError,
    isIdle,

    // Input
    url,
    format,

    // Transcript data
    transcript,
    availableLanguages,
    selectedLanguage,
    videoId,

    // Video metadata
    thumbnailUrl,
    videoMetadata,

    // Error state
    error,
    errorType,
    retryInfo,

    // Handlers
    handleUrlChange,
    handleFormatChange,
    handleLanguageChange,
    handleSubmit,
    getCopyContent,
    clearError,
    reset,
  } = useTranscriptExtractor()

  // Refresh history sidebar when extraction succeeds
  useEffect(() => {
    if (isSuccess && window.refreshHistorySidebar) {
      window.refreshHistorySidebar()
    }
  }, [isSuccess])

  const handleCopy = async () => {
    const content = getCopyContent()
    if (content) {
      await navigator.clipboard.writeText(content)
    }
  }

  const handleDownload = () => {
    const content = getCopyContent()
    if (!content) return

    const extensions = { txt: 'txt', srt: 'srt', vtt: 'vtt', json: 'json' }
    const mimeTypes = {
      txt: 'text/plain',
      srt: 'text/srt',
      vtt: 'text/vtt',
      json: 'application/json',
    }

    const blob = new Blob([content], { type: mimeTypes[format] || 'text/plain' })
    const downloadUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = `transcript.${extensions[format] || 'txt'}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(downloadUrl)
  }

  const handleSelectFromHistory = (historyItem) => {
    handleUrlChange(historyItem.video_url)
    setTimeout(() => {
      document.querySelector('form')?.requestSubmit()
    }, 100)
  }

  const handleBack = () => {
    reset()
    handleUrlChange('')
  }

  // Show transcript result view
  if (isSuccess && transcript) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header for result view */}
        <header className="flex items-center justify-between px-6 py-4 bg-gray-50">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">T</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900" style={{ fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif" }}>
                YouTube Transcript Extractor
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <UserMenu />
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Settings className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </header>

        {/* Result Content */}
        <div className="px-6 pb-8">
          <TranscriptResultView
            videoId={videoId}
            videoMetadata={videoMetadata}
            transcript={transcript}
            format={format}
            onFormatChange={handleFormatChange}
            availableLanguages={availableLanguages}
            selectedLanguage={selectedLanguage}
            onLanguageChange={handleLanguageChange}
            onCopy={handleCopy}
            onDownload={handleDownload}
            onBack={handleBack}
          />
        </div>
      </div>
    )
  }

  // Show home view with sidebar
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header - spans full width */}
      <header className="flex items-center justify-between px-8 py-4 bg-gray-50">
        <h1 className="text-2xl font-semibold" style={{ fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif" }}>
          <span className="text-blue-600">YouTube</span> Transcript Extractor
        </h1>
        <div className="flex items-center gap-3">
          <UserMenu />
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Settings className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      </header>

      {TESTING_MODE && (
        <div className="px-8 mb-3">
          <ApiEnvironmentSwitcher />
        </div>
      )}

      {/* Main area with sidebar and content */}
      <div className="flex flex-1">
        {TESTING_MODE && <DiagnosticSidebar apiError={error} retryInfo={retryInfo} />}

        {/* History Sidebar - only shows when authenticated */}
        <HistorySidebar
          onSelectTranscript={handleSelectFromHistory}
          currentVideoId={videoId}
          onTranscriptsLoaded={setRecentTranscripts}
        />

        {/* Main content */}
        <div className="flex-1 flex flex-col">
          {/* Content area */}
          <div className="flex-1 px-8 pb-8">
            {/* Default view - centered input + recent extractions */}
            <div className="max-w-5xl mx-auto">
              {/* Centered input area */}
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-full max-w-2xl">
                  <InputSection
                    url={url}
                    onUrlChange={handleUrlChange}
                    onSubmit={handleSubmit}
                    isLoading={isLoading}
                    placeholder="Paste YouTube URL here..."
                  />
                  <p className="text-center text-sm text-gray-500 mt-4">
                    Supports regular videos, live streams, and Shorts
                  </p>
                </div>
              </div>

              {/* Loading state */}
              {isLoading && (
                <div className="mb-8">
                  <LoadingState retryInfo={retryInfo} />
                </div>
              )}

              {/* Error state */}
              {isError && (
                <div className="mb-8">
                  <ErrorState
                    error={error}
                    errorType={errorType}
                    onDismiss={clearError}
                    onRetry={handleSubmit}
                  />
                </div>
              )}

              {/* Recent Extractions Grid - only when authenticated and has transcripts */}
              {isAuthenticated && recentTranscripts.length > 0 && !isLoading && !isError && (
                <RecentExtractionsGrid
                  transcripts={recentTranscripts}
                  onSelect={handleSelectFromHistory}
                  currentVideoId={videoId}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
