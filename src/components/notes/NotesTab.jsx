import { useState, useEffect, useCallback } from 'react'
import { Plus, RefreshCw, StickyNote } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import {
  getNotesByTranscript,
  createNote,
  updateNote,
  deleteNote,
} from '../../services/api'
import { Button } from '@/components/ui/button'
import NoteCard from './NoteCard'
import NoteEditor from './NoteEditor'

/**
 * Notes tab component for transcript viewer.
 */
export default function NotesTab({ transcriptId }) {
  const { getAccessToken } = useAuth()

  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showEditor, setShowEditor] = useState(false)

  const loadNotes = useCallback(async () => {
    if (!transcriptId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await getNotesByTranscript(transcriptId, getAccessToken)
      // Handle both array response and object with notes array
      const notesData = Array.isArray(response) ? response : (response.notes || [])
      setNotes(notesData)
    } catch (err) {
      console.error('Failed to load notes:', err)
      setError('Failed to load notes')
    } finally {
      setLoading(false)
    }
  }, [transcriptId, getAccessToken])

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  const handleCreateNote = async (content) => {
    try {
      const newNote = await createNote(transcriptId, content, getAccessToken)
      setNotes((prev) => [newNote, ...prev])
      setShowEditor(false)
    } catch (err) {
      console.error('Failed to create note:', err)
      throw err
    }
  }

  const handleUpdateNote = async (noteId, content) => {
    try {
      const updatedNote = await updateNote(noteId, content, getAccessToken)
      setNotes((prev) =>
        prev.map((note) => (note.id === noteId ? updatedNote : note))
      )
    } catch (err) {
      console.error('Failed to update note:', err)
      throw err
    }
  }

  const handleDeleteNote = async (noteId) => {
    try {
      await deleteNote(noteId, getAccessToken)
      setNotes((prev) => prev.filter((note) => note.id !== noteId))
    } catch (err) {
      console.error('Failed to delete note:', err)
      throw err
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-sm text-gray-500">Loading notes...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800 mb-3">{error}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={loadNotes}
          className="gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <StickyNote className="h-5 w-5 text-gray-500" />
          Your Notes
          {notes.length > 0 && (
            <span className="text-sm font-normal text-gray-500">
              ({notes.length})
            </span>
          )}
        </h3>
        {!showEditor && (
          <Button
            size="sm"
            onClick={() => setShowEditor(true)}
            className="h-9 px-4 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4" />
            Add Note
          </Button>
        )}
      </div>

      {/* Editor */}
      {showEditor && (
        <NoteEditor
          onSave={handleCreateNote}
          onCancel={() => setShowEditor(false)}
        />
      )}

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <StickyNote className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">No notes yet</p>
          <p className="text-sm text-gray-500 mb-4">
            Add notes to remember key points from this transcript
          </p>
          {!showEditor && (
            <Button
              size="sm"
              onClick={() => setShowEditor(true)}
              className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4" />
              Add Your First Note
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onUpdate={handleUpdateNote}
              onDelete={handleDeleteNote}
            />
          ))}
        </div>
      )}
    </div>
  )
}
