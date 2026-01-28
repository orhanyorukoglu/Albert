import { useState, useRef, useEffect } from 'react'
import { ArrowLeft, Search, Copy, Download, ChevronDown, ChevronUp, Check, Globe, FileText, ChevronLeft, ChevronRight, StickyNote, FileText as TranscriptIcon, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatDuration, formatViewCount, formatUploadDate, segmentsToSrt, segmentsToVtt, segmentsToParagraphs } from '../../utils/formatters'
import NotesTab from '../notes/NotesTab'
import AnalysisTab from './AnalysisTab'

export default function TranscriptResultView({
  videoId,
  videoMetadata,
  transcript,
  format,
  onFormatChange,
  availableLanguages = [],
  selectedLanguage,
  onLanguageChange,
  onCopy,
  onDownload,
  onBack,
  transcriptId,
  isSaved,
}) {
  const [showDescription, setShowDescription] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [copied, setCopied] = useState(false)
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0)
  const [activeTab, setActiveTab] = useState('transcript')
  const leftColumnRef = useRef(null)
  const scrollAreaRef = useRef(null)
  const matchRefs = useRef([])
  const [transcriptHeight, setTranscriptHeight] = useState(500)

  // Measure left column height to match transcript card
  useEffect(() => {
    const updateHeight = () => {
      if (leftColumnRef.current) {
        const leftHeight = leftColumnRef.current.offsetHeight
        // Subtract toolbar height (~58px) to get transcript card height
        const toolbarHeight = 58
        setTranscriptHeight(Math.max(leftHeight - toolbarHeight, 300))
      }
    }

    updateHeight()
    window.addEventListener('resize', updateHeight)

    // Also update after a short delay to account for iframe loading
    const timeout = setTimeout(updateHeight, 500)

    return () => {
      window.removeEventListener('resize', updateHeight)
      clearTimeout(timeout)
    }
  }, [videoMetadata, showDescription])

  const handleCopy = async () => {
    await onCopy()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Filter segments based on search query
  const segments = transcript?.segments || []
  const filteredSegments = searchQuery
    ? segments.filter(seg =>
        seg.text.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : segments

  // Format timestamp as [MM:SS]
  const formatTimestamp = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `[${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}]`
  }

  // Count total matches in transcript
  const countMatches = () => {
    if (!searchQuery) return 0
    const query = searchQuery.toLowerCase()
    let count = 0
    segments.forEach(seg => {
      const text = seg.text.toLowerCase()
      let idx = 0
      while ((idx = text.indexOf(query, idx)) !== -1) {
        count++
        idx += query.length
      }
    })
    return count
  }

  const totalMatches = countMatches()

  // Reset current match index when search query changes
  useEffect(() => {
    setCurrentMatchIndex(0)
    matchRefs.current = []
  }, [searchQuery])

  // Scroll to current match when index changes
  useEffect(() => {
    if (searchQuery && matchRefs.current[currentMatchIndex]) {
      matchRefs.current[currentMatchIndex].scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }, [currentMatchIndex, searchQuery])

  const goToNextMatch = () => {
    if (totalMatches > 0) {
      setCurrentMatchIndex((prev) => (prev + 1) % totalMatches)
    }
  }

  const goToPrevMatch = () => {
    if (totalMatches > 0) {
      setCurrentMatchIndex((prev) => (prev - 1 + totalMatches) % totalMatches)
    }
  }

  // Mutable counter for tracking match index during render
  const matchCounter = useRef(0)

  // Reset match counter before each render of transcript content
  const resetMatchCounter = () => {
    matchCounter.current = 0
  }

  // Highlight text with refs for navigation
  const highlightTextWithRefs = (text, query) => {
    if (!query) return text

    const parts = text.split(new RegExp(`(${escapeRegex(query)})`, 'gi'))

    return parts.map((part, index) => {
      if (part.toLowerCase() === query.toLowerCase()) {
        const matchIdx = matchCounter.current
        matchCounter.current++
        const isCurrentMatch = matchIdx === currentMatchIndex
        return (
          <mark
            key={index}
            ref={(el) => { matchRefs.current[matchIdx] = el }}
            className={`rounded px-0.5 ${
              isCurrentMatch
                ? 'bg-orange-400 text-white'
                : 'bg-yellow-200 text-gray-900'
            }`}
          >
            {part}
          </mark>
        )
      }
      return part
    })
  }

  // Get YouTube embed URL
  const embedUrl = videoId
    ? `https://www.youtube.com/embed/${videoId}`
    : null

  return (
    <div className="flex flex-col lg:flex-row lg:items-start gap-8 max-w-7xl mx-auto">
      {/* Left Column - Video Info */}
      <div ref={leftColumnRef} className="lg:w-[480px] shrink-0">
        {/* Video Player */}
        {embedUrl && (
          <div className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-lg">
            <iframe
              src={embedUrl}
              title={videoMetadata?.title || 'YouTube video'}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {/* Video Info Card */}
        <div className="mt-4 bg-white rounded-2xl p-6 shadow-sm">
          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 leading-tight">
            {videoMetadata?.title || 'Untitled Video'}
          </h2>

          {/* Channel */}
          {videoMetadata?.channel && (
            <div className="flex items-center gap-3 mt-4">
              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center overflow-hidden">
                <span className="text-sm font-semibold text-gray-600">
                  {videoMetadata.channel.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-base font-medium text-gray-800">
                {videoMetadata.channel}
              </span>
            </div>
          )}

          {/* Stats Row with dividers */}
          <div className="flex items-start mt-6">
            {videoMetadata?.duration_seconds && (
              <div className="pr-6">
                <p className="text-sm text-gray-500">Duration</p>
                <p className="text-lg font-semibold text-gray-900 mt-0.5">
                  {formatDuration(videoMetadata.duration_seconds)}
                </p>
              </div>
            )}
            {videoMetadata?.view_count && (
              <div className="px-6 border-l border-gray-200">
                <p className="text-sm text-gray-500">Views</p>
                <p className="text-lg font-semibold text-gray-900 mt-0.5">
                  {formatViewCount(videoMetadata.view_count)}
                </p>
              </div>
            )}
            {videoMetadata?.upload_date && (
              <div className="pl-6 border-l border-gray-200">
                <p className="text-sm text-gray-500">Uploaded</p>
                <p className="text-lg font-semibold text-gray-900 mt-0.5">
                  {formatUploadDate(videoMetadata.upload_date)}
                </p>
              </div>
            )}
          </div>

          {/* Show Description Toggle */}
          {videoMetadata?.description && (
            <div className="mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={() => setShowDescription(!showDescription)}
                className="flex items-center justify-between w-full text-base font-medium text-gray-800 hover:text-gray-900 transition-colors"
              >
                Show description
                <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${showDescription ? 'rotate-180' : ''}`} />
              </button>
              {showDescription && (
                <p className="mt-4 text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                  {videoMetadata.description}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Column - Transcript & Notes */}
      <div className="flex-1 min-w-0">
        {/* Tabs */}
        <div className="flex items-center gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
          <button
            onClick={() => setActiveTab('transcript')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'transcript'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <TranscriptIcon className="h-4 w-4" />
            Transcript
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            disabled={!transcriptId}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'notes'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            } ${!transcriptId ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={!transcriptId ? 'Sign in to save transcripts and add notes' : ''}
          >
            <StickyNote className="h-4 w-4" />
            Notes
          </button>
          <button
            onClick={() => setActiveTab('analysis')}
            disabled={!transcriptId}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'analysis'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            } ${!transcriptId ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={!transcriptId ? 'Sign in to save transcripts and access analysis' : ''}
          >
            <Sparkles className="h-4 w-4" />
            Analysis
          </button>
        </div>

        {/* Transcript Tab Content */}
        <div className={activeTab !== 'transcript' ? 'hidden' : ''}>
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[150px] max-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search transcript..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 bg-white"
            />
          </div>

          {/* Format Selector */}
          <Select value={format} onValueChange={onFormatChange}>
            <SelectTrigger className="w-[150px] h-10 bg-white">
              <FileText className="h-4 w-4 mr-2 text-gray-500 shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="txt">TXT</SelectItem>
              <SelectItem value="paragraph">Paragraph</SelectItem>
              <SelectItem value="srt">SRT</SelectItem>
              <SelectItem value="vtt">VTT</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
            </SelectContent>
          </Select>

          {/* Language Selector - always show if languages available */}
          {availableLanguages.length > 0 && (
            <Select value={selectedLanguage} onValueChange={(value) => onLanguageChange(value)} disabled={availableLanguages.length === 1}>
              <SelectTrigger className="w-[140px] h-10 bg-white">
                <Globe className="h-4 w-4 mr-2 text-gray-500 shrink-0" />
                <SelectValue className="truncate" />
              </SelectTrigger>
              <SelectContent>
                {availableLanguages.map((lang, index) => (
                  <SelectItem key={`${lang.code}-${index}`} value={lang.code}>
                    {lang.name || lang.code}
                    {lang.is_generated ? ' (auto)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Copy Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="h-10 px-4 gap-2"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied ? 'Copied!' : 'Copy'}
          </Button>

          {/* Download Button */}
          <Button
            size="sm"
            onClick={onDownload}
            className="h-10 px-4 gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
        </div>

        {/* Search Results Navigation */}
        {searchQuery && totalMatches > 0 && (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 mb-4">
            <span className="text-sm text-blue-800">
              {totalMatches} {totalMatches === 1 ? 'match' : 'matches'} found
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-blue-700">
                {currentMatchIndex + 1} of {totalMatches}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={goToPrevMatch}
                className="h-8 w-8 p-0"
                disabled={totalMatches <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={goToNextMatch}
                className="h-8 w-8 p-0"
                disabled={totalMatches <= 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {searchQuery && totalMatches === 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 mb-4">
            <span className="text-sm text-gray-600">No matches found</span>
          </div>
        )}

        {/* Transcript Content */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <ScrollArea style={{ height: transcriptHeight }}>
            <div className="p-6">
              {/* Reset match counter before rendering */}
              {resetMatchCounter()}
              {format === 'txt' ? (
                // TXT format with timestamps
                <div className="space-y-4">
                  {filteredSegments.map((segment, index) => (
                    <div key={index} className="flex gap-3">
                      <a
                        href={`https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(segment.start)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 font-mono text-sm shrink-0"
                      >
                        {formatTimestamp(segment.start)}
                      </a>
                      <p className="text-gray-800 leading-relaxed">
                        {searchQuery ? (
                          highlightTextWithRefs(segment.text, searchQuery)
                        ) : (
                          segment.text
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              ) : format === 'paragraph' ? (
                // Paragraph format - readable flowing text
                <div className="prose prose-gray max-w-none">
                  {segments.length > 0 ? (
                    segmentsToParagraphs(segments).map((paragraph, index) => (
                      <p key={index} className="text-gray-800 leading-relaxed mb-4 last:mb-0">
                        {searchQuery ? highlightTextWithRefs(paragraph, searchQuery) : paragraph}
                      </p>
                    ))
                  ) : (
                    <p className="text-gray-500">No transcript data</p>
                  )}
                </div>
              ) : format === 'srt' ? (
                // SRT format - monospace
                <pre className="text-sm font-mono text-gray-800 whitespace-pre-wrap">
                  {segments.length > 0 ? segmentsToSrt(segments) : 'No transcript data'}
                </pre>
              ) : format === 'vtt' ? (
                // VTT format - monospace
                <pre className="text-sm font-mono text-gray-800 whitespace-pre-wrap">
                  {segments.length > 0 ? segmentsToVtt(segments) : 'No transcript data'}
                </pre>
              ) : (
                // JSON format - monospace
                <pre className="text-sm font-mono text-gray-800 whitespace-pre-wrap">
                  {JSON.stringify(transcript, null, 2)}
                </pre>
              )}
            </div>
          </ScrollArea>
        </div>
        </div>

        {/* Notes Tab Content */}
        {transcriptId && (
          <div className={activeTab !== 'notes' ? 'hidden' : ''}>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <ScrollArea style={{ height: transcriptHeight }}>
                <div className="p-6">
                  <NotesTab transcriptId={transcriptId} />
                </div>
              </ScrollArea>
            </div>
          </div>
        )}

        {/* Notes unavailable message (when not authenticated) */}
        {activeTab === 'notes' && !transcriptId && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-8 text-center">
              <StickyNote className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Notes Unavailable</h3>
              <p className="text-gray-600">
                Sign in to save transcripts and add notes to them.
              </p>
            </div>
          </div>
        )}

        {/* Analysis Tab Content */}
        {transcriptId && (
          <div className={activeTab !== 'analysis' ? 'hidden' : ''}>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <ScrollArea style={{ height: transcriptHeight }}>
                <div className="p-6">
                  <AnalysisTab transcriptId={transcriptId} />
                </div>
              </ScrollArea>
            </div>
          </div>
        )}

        {/* Analysis unavailable message (when not authenticated) */}
        {activeTab === 'analysis' && !transcriptId && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-8 text-center">
              <Sparkles className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Analysis Unavailable</h3>
              <p className="text-gray-600">
                Sign in to save transcripts and access AI-powered analysis.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Helper function to escape regex special characters
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
