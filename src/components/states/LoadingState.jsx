import { Loader2 } from 'lucide-react'

export default function LoadingState({ retryInfo }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Extracting transcript...
      </h3>
      {retryInfo ? (
        <p className="text-muted-foreground text-sm">
          Attempt {retryInfo.attempt} of {retryInfo.maxRetries}
          {retryInfo.delay && ` - retrying in ${retryInfo.delay}ms`}
        </p>
      ) : (
        <p className="text-muted-foreground text-sm">
          This may take a moment for longer videos
        </p>
      )}
    </div>
  )
}
