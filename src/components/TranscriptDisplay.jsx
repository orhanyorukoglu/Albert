import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'

export default function TranscriptDisplay({ transcript, format }) {
  if (!transcript) return null

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

  const formatContent = () => {
    if (typeof transcript === 'string') {
      return format === 'txt' ? transcript.replace(/\n+/g, ' ').trim() : transcript
    }

    // Handle legacy format with format-specific content
    if (format === 'srt' && transcript.srt_content) {
      return transcript.srt_content
    }
    if (format === 'vtt' && transcript.vtt_content) {
      return transcript.vtt_content
    }
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

    // Default to JSON formatting
    return JSON.stringify(transcript, null, 2)
  }

  const isMonospace = format === 'srt' || format === 'vtt' || format === 'json'
  const preserveWhitespace = format === 'srt' || format === 'vtt' || format === 'json'

  return (
    <Card className="mt-6 bg-muted/50">
      <CardContent className="p-0">
        <ScrollArea className="h-96 w-full">
          <div
            className={`p-4 ${
              preserveWhitespace ? 'whitespace-pre-wrap' : ''
            } ${isMonospace ? 'font-mono text-sm' : 'text-base leading-relaxed'}`}
          >
            {formatContent()}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
