import { Youtube } from 'lucide-react'

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Youtube className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        No transcript yet
      </h3>
      <p className="text-muted-foreground max-w-sm">
        Paste a YouTube link above to extract the transcript in your preferred format.
      </p>
    </div>
  )
}
