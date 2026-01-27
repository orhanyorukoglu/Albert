/**
 * Utility functions for formatting transcript and video data
 */

/**
 * Format view count (e.g., 1.7B, 1.2M, 1.1K)
 */
export function formatViewCount(count) {
  if (count == null) return null
  if (count >= 1_000_000_000) {
    return `${(count / 1_000_000_000).toFixed(1)}B`
  }
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}K`
  }
  return count.toLocaleString()
}

/**
 * Format upload date (YYYYMMDD to readable format)
 */
export function formatUploadDate(dateStr) {
  if (!dateStr || dateStr.length !== 8) return null
  const year = dateStr.slice(0, 4)
  const month = dateStr.slice(4, 6)
  const day = dateStr.slice(6, 8)
  const date = new Date(year, parseInt(month) - 1, day)
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

/**
 * Format duration in seconds to readable format (e.g., "24:59" or "1:24:59")
 */
export function formatDuration(seconds) {
  if (!seconds) return null
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${mins}:${String(secs).padStart(2, '0')}`
}

/**
 * Format time for SRT/VTT subtitles
 */
export function formatTime(seconds, forVtt = false) {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.round((seconds % 1) * 1000)
  const separator = forVtt ? '.' : ','
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}${separator}${String(ms).padStart(3, '0')}`
}

/**
 * Convert segments to SRT format
 */
export function segmentsToSrt(segments) {
  return segments.map((seg, i) => {
    const start = formatTime(seg.start)
    const end = formatTime(seg.end || seg.start + seg.duration)
    return `${i + 1}\n${start} --> ${end}\n${seg.text}\n`
  }).join('\n')
}

/**
 * Convert segments to VTT format
 */
export function segmentsToVtt(segments) {
  const cues = segments.map((seg) => {
    const start = formatTime(seg.start, true)
    const end = formatTime(seg.end || seg.start + seg.duration, true)
    return `${start} --> ${end}\n${seg.text}\n`
  }).join('\n')
  return `WEBVTT\n\n${cues}`
}

/**
 * Convert segments to plain text
 */
export function segmentsToText(segments) {
  return segments.map(seg => seg.text).join(' ')
}

/**
 * Convert segments to paragraphs for better readability
 * Breaks into paragraphs based on:
 * - Time gaps > 2 seconds between segments (only if current text ends with . ? !)
 * - After ~4+ sentences (only breaking at sentence boundaries)
 */
export function segmentsToParagraphs(segments) {
  if (!segments || segments.length === 0) return []

  const paragraphs = []
  let currentParagraph = []
  let sentenceCount = 0

  // Check if text ends with sentence-ending punctuation
  const endsWithSentence = (text) => /[.!?]["']?\s*$/.test(text.trim())

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    const prevSeg = segments[i - 1]
    const text = seg.text.trim()

    // Add current segment to paragraph
    currentParagraph.push(text)

    // Count sentences in this segment
    const sentences = (text.match(/[.!?]+/g) || []).length
    sentenceCount += sentences

    // Check for time gap (> 2 seconds indicates a natural pause)
    const nextSeg = segments[i + 1]
    const hasTimeGapAfter = nextSeg && (nextSeg.start - (seg.end || seg.start + seg.duration)) > 2

    // Get the current accumulated text
    const currentText = currentParagraph.join(' ')

    // Start new paragraph if:
    // - Current text ends with a sentence AND
    // - (There's a significant time gap coming OR we've accumulated enough sentences)
    if (endsWithSentence(currentText) && (hasTimeGapAfter || sentenceCount >= 4)) {
      paragraphs.push(currentText)
      currentParagraph = []
      sentenceCount = 0
    }
  }

  // Add remaining text
  if (currentParagraph.length > 0) {
    paragraphs.push(currentParagraph.join(' '))
  }

  return paragraphs
}

/**
 * Get formatted content based on transcript data and format
 */
export function getFormattedContent(transcript, format) {
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
