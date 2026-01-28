import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { listTranscripts, deleteTranscript } from '../../services/api'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Loader2, Search, Trash2 } from 'lucide-react'

export default function HistorySidebar({ onSelectTranscript, currentVideoId, onTranscriptsLoaded }) {
  const { isAuthenticated, getAccessToken } = useAuth()
  const [transcripts, setTranscripts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      fetchTranscripts()
    } else {
      setTranscripts([])
      setError(null)
      onTranscriptsLoaded?.([])
    }
  }, [isAuthenticated])

  const fetchTranscripts = async () => {
    if (!isAuthenticated) return

    setLoading(true)
    setError(null)
    try {
      const data = await listTranscripts({ limit: 50 }, getAccessToken)
      setTranscripts(data)
      onTranscriptsLoaded?.(data)
    } catch (err) {
      console.error('Failed to fetch transcripts:', err)
      if (err.message?.includes('Not Found') || err.message?.includes('404')) {
        setError('History feature coming soon')
      } else {
        setError(err.message)
      }
      onTranscriptsLoaded?.([])
    } finally {
      setLoading(false)
    }
  }

  // Refresh list when a new transcript is extracted
  const refresh = () => {
    if (isAuthenticated) {
      fetchTranscripts()
    }
  }

  // Expose refresh method
  useEffect(() => {
    window.refreshHistorySidebar = refresh
    return () => {
      delete window.refreshHistorySidebar
    }
  }, [isAuthenticated])

  // Open delete confirmation modal
  const handleDeleteClick = (transcript, e) => {
    e.stopPropagation()
    const title = transcript.video_title || transcript.title || 'Untitled Video'
    setDeleteTarget({ id: transcript.id, title })
  }

  // Actually delete the transcript
  const confirmDelete = async () => {
    if (!deleteTarget) return

    setIsDeleting(true)
    try {
      await deleteTranscript(deleteTarget.id, getAccessToken)
      const updated = transcripts.filter(t => t.id !== deleteTarget.id)
      setTranscripts(updated)
      onTranscriptsLoaded?.(updated)
      setDeleteTarget(null)
    } catch (err) {
      console.error('Failed to delete transcript:', err)
      setDeleteTarget(null)
    } finally {
      setIsDeleting(false)
    }
  }

  // Don't show sidebar if not authenticated
  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="w-80 shrink-0 bg-white border-r border-gray-200 flex flex-col min-h-0">
      {/* Header */}
      <div className="px-4 py-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">History</h2>
        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <Search className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <p className="text-sm text-muted-foreground text-center mb-2">
            {error}
          </p>
          {error !== 'History feature coming soon' && (
            <Button variant="outline" size="sm" onClick={fetchTranscripts}>
              Retry
            </Button>
          )}
        </div>
      ) : transcripts.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-sm text-muted-foreground text-center">
            No extractions yet.<br />
            Extract a transcript to see it here.
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1 min-h-0">
          <div className="py-1">
            {transcripts.map((transcript) => (
              <HistoryItem
                key={transcript.id}
                transcript={transcript}
                isActive={transcript.video_id === currentVideoId}
                onClick={() => onSelectTranscript?.(transcript)}
                onDelete={(e) => handleDeleteClick(transcript, e)}
              />
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Delete confirmation modal */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transcript</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "<span className="font-medium text-foreground">{deleteTarget?.title}</span>" from your history? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function HistoryItem({ transcript, isActive, onClick, onDelete }) {
  const [isHovered, setIsHovered] = useState(false)
  const thumbnailUrl = transcript.thumbnail_url || transcript.thumbnail
  const title = transcript.video_title || transcript.title || 'Untitled Video'
  const timeAgo = getTimeAgo(transcript.created_at)

  return (
    <div
      className={`relative flex items-start gap-3 py-3 px-3 cursor-pointer transition-colors ${
        isActive ? 'bg-blue-50' : 'hover:bg-gray-50'
      }`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Active indicator - blue left border */}
      {isActive && (
        <div className="absolute left-0 top-2 bottom-2 w-1 bg-blue-500 rounded-r" />
      )}

      {/* Thumbnail */}
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt=""
          className="w-16 h-12 object-cover rounded shrink-0 bg-gray-200"
        />
      ) : (
        <div className="w-16 h-12 bg-gray-200 rounded shrink-0 flex items-center justify-center">
          <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
          </svg>
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">
          {title}
        </p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-gray-400">
            {timeAgo}
          </p>
          {/* Delete button - shows on hover */}
          {isHovered && (
            <button
              onClick={onDelete}
              className="p-1 rounded hover:bg-red-100 transition-colors"
              title="Delete from history"
            >
              <Trash2 className="h-3.5 w-3.5 text-red-500" />
            </button>
          )}
        </div>
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

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString()
}
