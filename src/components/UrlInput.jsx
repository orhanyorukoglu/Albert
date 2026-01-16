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
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter YouTube URL..."
          disabled={disabled}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        {showError && (
          <p className="mt-1 text-sm text-red-500">Please enter a valid YouTube URL</p>
        )}
      </div>
      <button
        type="submit"
        disabled={disabled || !isValidUrl}
        className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {disabled ? 'Loading...' : 'Get'}
      </button>
    </form>
  )
}
