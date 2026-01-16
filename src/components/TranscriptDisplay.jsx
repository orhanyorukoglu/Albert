export default function TranscriptDisplay({ transcript, format }) {
  if (!transcript) return null

  const formatContent = () => {
    if (typeof transcript === 'string') {
      return format === 'txt' ? transcript.replace(/\n+/g, ' ').trim() : transcript
    }

    // Extract format-specific content from API response
    if (format === 'srt' && transcript.srt_content) {
      return transcript.srt_content
    }
    if (format === 'vtt' && transcript.vtt_content) {
      return transcript.vtt_content
    }
    if (format === 'txt') {
      const text = transcript.full_text || transcript.txt_content || transcript.transcript || ''
      // Replace newlines with spaces for flowing paragraph text
      return text.replace(/\n+/g, ' ').trim()
    }

    // Default to JSON formatting
    return JSON.stringify(transcript, null, 2)
  }

  const isMonospace = format === 'srt' || format === 'vtt' || format === 'json'
  const preserveWhitespace = format === 'srt' || format === 'vtt' || format === 'json'

  return (
    <div className="mt-6">
      <div
        className={`w-full h-96 p-4 bg-gray-50 border border-gray-200 rounded-lg overflow-auto ${
          preserveWhitespace ? 'whitespace-pre-wrap' : ''
        } ${isMonospace ? 'font-mono text-sm' : 'text-base leading-relaxed'}`}
      >
        {formatContent()}
      </div>
    </div>
  )
}
