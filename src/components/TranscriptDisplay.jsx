export default function TranscriptDisplay({ transcript, format }) {
  if (!transcript) return null

  const formatContent = () => {
    if (typeof transcript === 'string') {
      return transcript
    }

    // Extract format-specific content from API response
    if (format === 'srt' && transcript.srt_content) {
      return transcript.srt_content
    }
    if (format === 'vtt' && transcript.vtt_content) {
      return transcript.vtt_content
    }
    if (format === 'txt' && transcript.full_text) {
      return transcript.full_text
    }
    if (format === 'txt' && transcript.txt_content) {
      return transcript.txt_content
    }
    if (format === 'txt' && transcript.transcript) {
      return transcript.transcript
    }

    // Default to JSON formatting
    return JSON.stringify(transcript, null, 2)
  }

  const isMonospace = format === 'srt' || format === 'vtt' || format === 'json'

  return (
    <div className="mt-6">
      <div
        className={`w-full h-96 p-4 bg-gray-50 border border-gray-200 rounded-lg overflow-auto whitespace-pre-wrap ${
          isMonospace ? 'font-mono text-sm' : 'text-base'
        }`}
      >
        {formatContent()}
      </div>
    </div>
  )
}
