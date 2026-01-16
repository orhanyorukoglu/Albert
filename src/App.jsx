import { useState } from 'react'
import { extractTranscript } from './services/api'
import UrlInput from './components/UrlInput'
import FormatSelector from './components/FormatSelector'
import TranscriptDisplay from './components/TranscriptDisplay'
import CopyButton from './components/CopyButton'
import DownloadButton from './components/DownloadButton'
import LoadingSpinner from './components/LoadingSpinner'
import ErrorMessage from './components/ErrorMessage'
import DiagnosticSidebar from './components/DiagnosticSidebar'

const TESTING_MODE = import.meta.env.VITE_TESTING_MODE === 'yes'

function App() {
  const [url, setUrl] = useState('')
  const [format, setFormat] = useState('json')
  const [transcript, setTranscript] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const getCopyContent = () => {
    if (!transcript) return null
    if (typeof transcript === 'string') return transcript
    if (format === 'srt' && transcript.srt_content) return transcript.srt_content
    if (format === 'vtt' && transcript.vtt_content) return transcript.vtt_content
    if (format === 'txt' && transcript.full_text) return transcript.full_text
    if (format === 'txt' && transcript.txt_content) return transcript.txt_content
    if (format === 'txt' && transcript.transcript) return transcript.transcript
    return JSON.stringify(transcript, null, 2)
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    setTranscript(null)

    try {
      const result = await extractTranscript(url, format)
      setTranscript(result)
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {TESTING_MODE && <DiagnosticSidebar />}

      <div className="flex-1 bg-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-center mb-8">
            Albert - YouTube Transcript Extractor
          </h1>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <UrlInput
              value={url}
              onChange={setUrl}
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

            <ErrorMessage
              message={error}
              onDismiss={() => setError(null)}
            />

            {loading && <LoadingSpinner />}

            {transcript && !loading && (
              <>
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

export default App
