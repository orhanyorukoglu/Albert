import { AlertCircle, XCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

export default function ErrorState({ error, errorType, onDismiss, onRetry }) {
  const isValidation = errorType === 'validation'
  const isNotFound = errorType === 'not_found'

  return (
    <div className="py-8">
      <Alert variant={isNotFound || isValidation ? 'default' : 'destructive'} className="relative">
        {isNotFound || isValidation ? (
          <AlertCircle className="h-4 w-4" />
        ) : (
          <XCircle className="h-4 w-4" />
        )}
        <AlertTitle>
          {isNotFound
            ? 'No Transcript Available'
            : isValidation
              ? 'Invalid Input'
              : 'Something went wrong'}
        </AlertTitle>
        <AlertDescription className="mt-2">
          {isNotFound
            ? 'This video does not have any transcripts or captions available.'
            : error}
        </AlertDescription>
        <div className="mt-4 flex gap-2">
          {!isValidation && !isNotFound && onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Try again
            </Button>
          )}
          {onDismiss && (
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              Dismiss
            </Button>
          )}
        </div>
      </Alert>
    </div>
  )
}
