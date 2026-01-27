import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

const YOUTUBE_URL_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/

export default function UrlInput({ value, onChange, onSubmit, disabled }) {
  const isValidUrl = YOUTUBE_URL_REGEX.test(value)
  const showError = value && !isValidUrl

  const handleSubmit = (e) => {
    e.preventDefault()
    if (isValidUrl && !disabled) {
      onSubmit()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <div className="flex-1">
        <Input
          id="youtube-url"
          name="youtube-url"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter YouTube URL..."
          disabled={disabled}
          aria-label="YouTube URL"
          className={`h-11 ${showError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
        />
        {showError && (
          <p className="mt-1 text-sm text-destructive">Please enter a valid YouTube URL</p>
        )}
      </div>
      <Button
        type="submit"
        disabled={disabled || !isValidUrl}
        className="h-11 px-6"
      >
        {disabled ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </>
        ) : (
          'Get'
        )}
      </Button>
    </form>
  )
}
