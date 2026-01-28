import { useState } from 'react'
import { Pencil, Trash2, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Format relative time from a date string.
 */
function formatRelativeTime(dateString) {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now - date) / 1000)

  if (diffInSeconds < 60) {
    return 'just now'
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours}h ago`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) {
    return `${diffInDays}d ago`
  }

  if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7)
    return `${weeks}w ago`
  }

  if (diffInDays < 365) {
    const months = Math.floor(diffInDays / 30)
    return `${months}mo ago`
  }

  const years = Math.floor(diffInDays / 365)
  return `${years}y ago`
}

/**
 * Individual note display with edit/delete actions.
 */
export default function NoteCard({ note, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(note.content)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (!editContent.trim()) return

    setIsSaving(true)
    try {
      await onUpdate(note.id, editContent)
      setIsEditing(false)
    } catch (err) {
      console.error('Failed to save note:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditContent(note.content)
    setIsEditing(false)
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this note?')) return

    setIsDeleting(true)
    try {
      await onDelete(note.id)
    } catch (err) {
      console.error('Failed to delete note:', err)
      setIsDeleting(false)
    }
  }

  const isEdited = note.updated_at && note.updated_at !== note.created_at

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="text-base">📝</span>
          <span>{formatRelativeTime(note.created_at)}</span>
          {isEdited && (
            <span className="text-xs text-gray-400">(edited)</span>
          )}
        </div>

        {!isEditing && (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-8 w-8 p-0 text-gray-500 hover:text-blue-600"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="h-8 w-8 p-0 text-gray-500 hover:text-red-600 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      {isEditing ? (
        <div>
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full border border-gray-300 rounded-md p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={4}
            autoFocus
          />
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!editContent.trim() || isSaving}
              className="h-8 px-3 gap-1.5"
            >
              <Check className="h-3.5 w-3.5" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              className="h-8 px-3 gap-1.5"
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-gray-800 text-sm whitespace-pre-wrap leading-relaxed">
          {note.content}
        </p>
      )}
    </div>
  )
}
