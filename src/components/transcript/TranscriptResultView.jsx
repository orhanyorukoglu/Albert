import { useState, useRef, useEffect } from 'react'
import { ArrowLeft, Search, Copy, Download, ChevronDown, ChevronUp, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { formatDuration, formatViewCount, formatUploadDate, segmentsToSrt, segmentsToVtt } from '../../utils/formatters'

export default function TranscriptResultView({
  videoId,
  videoMetadata,
  transcript,
  format,
  onFormatChange,
  onCopy,
  onDownload,
  onBack,
}) {
  const [showDescription, setShowDescription] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [copied, setCopied] = useState(false)
  const leftColumnRef = useRef(null)
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

      {/* Right Column - Transcript */}
      <div className="flex-1 min-w-0">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search transcript..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 bg-white"
            />
          </div>

          {/* Format Toggle */}
          <ToggleGroup
            type="single"
            value={format}
            onValueChange={(value) => value && onFormatChange(value)}
            className="bg-gray-100 p-1 rounded-lg"
          >
            {['txt', 'srt', 'vtt', 'json'].map((fmt) => (
              <ToggleGroupItem
                key={fmt}
                value={fmt}
                className={`px-4 h-8 text-sm font-medium rounded-md transition-all ${
                  format === fmt
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {fmt.toUpperCase()}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

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

        {/* Transcript Content */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <ScrollArea style={{ height: transcriptHeight }}>
            <div className="p-6">
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
                          highlightText(segment.text, searchQuery)
                        ) : (
                          segment.text
                        )}
                      </p>
                    </div>
                  ))}
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
    </div>
  )
}

// Helper function to highlight search matches
function highlightText(text, query) {
  if (!query) return text

  const parts = text.split(new RegExp(`(${escapeRegex(query)})`, 'gi'))

  return parts.map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={index} className="bg-yellow-200 text-gray-900 rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  )
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
