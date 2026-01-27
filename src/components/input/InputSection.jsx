import { X, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const YOUTUBE_URL_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[\w-]+/

export default function InputSection({ url, onUrlChange, onSubmit, isLoading, placeholder = "Paste a YouTube URL here..." }) {
  const isValidUrl = YOUTUBE_URL_REGEX.test(url)
  const showError = url && !isValidUrl

  const handleSubmit = (e) => {
    e.preventDefault()
    if (isValidUrl && !isLoading) {
      onSubmit()
    }
  }

  const handleClear = () => {
    onUrlChange('')
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className={`flex items-center gap-2 p-2 pl-5 rounded-full border bg-white shadow-sm ${showError ? 'border-red-300' : 'border-gray-200'}`}>
        <div className="relative flex-1">
          <input
            id="youtube-url"
            name="youtube-url"
            type="text"
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder={placeholder}
            disabled={isLoading}
            aria-label="YouTube URL"
            className="w-full h-10 text-base bg-transparent border-none outline-none placeholder:text-gray-400"
          />
          {url && !isLoading && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Clear URL"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        <Button
          type="submit"
          disabled={isLoading || !isValidUrl}
          className="h-10 px-6 rounded-full bg-blue-700 hover:bg-blue-800 text-white font-medium disabled:bg-blue-400 disabled:opacity-100"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Extracting...
            </>
          ) : (
            'Get Transcript'
          )}
        </Button>
      </div>
      {showError && (
        <p className="text-sm text-red-500 mt-2 pl-5">Please enter a valid YouTube URL</p>
      )}
    </form>
  )
}
