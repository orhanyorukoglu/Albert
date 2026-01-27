import { formatDuration } from '../../utils/formatters'

export default function RecentExtractionsGrid({ transcripts, onSelect, currentVideoId }) {
  if (!transcripts || transcripts.length === 0) return null

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Extractions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {transcripts.slice(0, 8).map((transcript) => (
          <RecentCard
            key={transcript.id}
            transcript={transcript}
            isActive={transcript.video_id === currentVideoId}
            onClick={() => onSelect?.(transcript)}
          />
        ))}
      </div>
    </div>
  )
}

function RecentCard({ transcript, isActive, onClick }) {
  const thumbnailUrl = transcript.thumbnail_url || transcript.thumbnail
  const title = transcript.video_title || transcript.title || 'Untitled Video'
  const duration = transcript.duration_seconds || transcript.duration
  const timeAgo = getTimeAgo(transcript.created_at)

  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-xl overflow-hidden transition-all hover:shadow-md ${
        isActive ? 'ring-2 ring-primary shadow-md' : 'bg-white border border-gray-100'
      }`}
    >
      {/* Thumbnail with duration overlay */}
      <div className="relative aspect-video bg-gray-200">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <svg className="w-10 h-10 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
            </svg>
          </div>
        )}
        {duration && (
          <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
            {formatDuration(duration)}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug mb-2">
          {title}
        </p>
        <p className="text-xs text-gray-500">{timeAgo}</p>
      </div>
    </div>
  )
}

function getTimeAgo(dateString) {
  if (!dateString) return ''

  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  const diffWeeks = Math.floor(diffDays / 7)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffWeeks === 1) return '1 week ago'
  return `${diffWeeks} weeks ago`
}
