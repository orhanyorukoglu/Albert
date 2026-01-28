import { useState } from 'react'
import { Send, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Note creation form.
 */
export default function NoteEditor({ onSave, onCancel, autoFocus = true }) {
  const [content, setContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!content.trim()) return

    setIsSaving(true)
    try {
      await onSave(content)
      setContent('')
    } catch (err) {
      console.error('Failed to save note:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeyDown = (e) => {
    // Submit on Cmd/Ctrl + Enter
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      if (content.trim() && !isSaving) {
        handleSubmit(e)
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Write your note here..."
        className="w-full border border-gray-300 rounded-md p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white"
        rows={4}
        autoFocus={autoFocus}
      />
      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-gray-400">
          Press Cmd/Ctrl + Enter to save
        </span>
        <div className="flex gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="h-9 px-4 gap-1.5"
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            size="sm"
            disabled={!content.trim() || isSaving}
            className="h-9 px-4 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Send className="h-3.5 w-3.5" />
            {isSaving ? 'Saving...' : 'Save Note'}
          </Button>
        </div>
      </div>
    </form>
  )
}
