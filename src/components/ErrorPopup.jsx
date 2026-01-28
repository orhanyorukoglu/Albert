import { useEffect } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertCircle, AlertTriangle, XCircle, X } from 'lucide-react'

export default function ErrorPopup({ error, errorType, onClose }) {
  const isValidationError = errorType === 'validation'
  const isNotFoundError = errorType === 'not_found'

  useEffect(() => {
    if (error && (isValidationError || isNotFoundError)) {
      const timer = setTimeout(() => {
        onClose()
      }, 10000)
      return () => clearTimeout(timer)
    }
  }, [error, isValidationError, isNotFoundError, onClose])

  if (!error) return null

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
      <Alert
        variant={isValidationError || isNotFoundError ? 'default' : 'destructive'}
        className="max-w-sm shadow-lg border-2 pr-10"
      >
        {isNotFoundError ? (
          <AlertCircle className="h-4 w-4" />
        ) : isValidationError ? (
          <AlertTriangle className="h-4 w-4 text-amber-500" />
        ) : (
          <XCircle className="h-4 w-4" />
        )}
        <AlertTitle>
          {isNotFoundError ? 'No Transcript' : isValidationError ? 'Invalid Input' : 'Error'}
        </AlertTitle>
        <AlertDescription>
          {isNotFoundError
            ? 'This video does not have any transcripts or captions available.'
            : error}
        </AlertDescription>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-6 w-6"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </Alert>
    </div>
  )
}
