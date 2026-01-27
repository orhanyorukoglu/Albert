import { AlertCircle, XCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

export default function ErrorState({ error, errorType, onDismiss, onRetry }) {
  const isValidation = errorType === 'validation'

  return (
    <div className="py-8">
      <Alert variant="destructive" className="relative">
        {isValidation ? (
          <AlertCircle className="h-4 w-4" />
        ) : (
          <XCircle className="h-4 w-4" />
        )}
        <AlertTitle>
          {isValidation ? 'Invalid Input' : 'Something went wrong'}
        </AlertTitle>
        <AlertDescription className="mt-2">
          {error}
        </AlertDescription>
        <div className="mt-4 flex gap-2">
          {!isValidation && onRetry && (
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
