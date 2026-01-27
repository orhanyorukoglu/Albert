import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatViewCount, formatUploadDate, formatDuration } from '@/utils/formatters'

export default function VideoConfirmation({ thumbnailUrl, metadata }) {
  const [showDetails, setShowDetails] = useState(false)

  if (!thumbnailUrl && !metadata) return null

  return (
    <Card className="bg-muted/30 border-muted">
      <CardContent className="pt-0 px-3 pb-3">
        <div className="flex gap-5">
          {/* Thumbnail */}
          {thumbnailUrl && (
            <img
              src={thumbnailUrl}
              alt="Video thumbnail"
              className="rounded-xl w-72 h-auto object-cover shrink-0 shadow-sm"
            />
          )}

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-2 py-1">
            {/* Title and badges */}
            {metadata?.title && (
              <div className="flex items-start gap-2">
                <h3 className="font-medium text-gray-900 line-clamp-2 flex-1">
                  {metadata.title}
                </h3>
                <div className="flex gap-1 shrink-0">
                  {metadata.is_short && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                      Short
                    </Badge>
                  )}
                  {metadata.is_live && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                      LIVE
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Channel */}
            {metadata?.channel && (
              <p className="text-sm text-muted-foreground">{metadata.channel}</p>
            )}

            {/* Stats row - Duration, Views, Upload date */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {metadata?.duration_seconds && (
                <span>
                  <span className="text-gray-500 font-medium">Duration:</span>{' '}
                  {formatDuration(metadata.duration_seconds)}
                </span>
              )}
              {metadata?.view_count != null && (
                <span>
                  <span className="text-gray-500 font-medium">Views:</span>{' '}
                  {formatViewCount(metadata.view_count)}
                </span>
              )}
              {metadata?.upload_date && (
                <span>
                  <span className="text-gray-500 font-medium">Uploaded:</span>{' '}
                  {formatUploadDate(metadata.upload_date)}
                </span>
              )}
            </div>

            {/* Show details toggle (only if description exists) */}
            {metadata?.description && (
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                {showDetails ? (
                  <>
                    Hide description
                    <ChevronUp className="h-3 w-3" />
                  </>
                ) : (
                  <>
                    Show description
                    <ChevronDown className="h-3 w-3" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Expanded description */}
        {showDetails && metadata?.description && (
          <div className="mt-4 pt-4 border-t border-muted">
            <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 max-h-32 overflow-y-auto whitespace-pre-line">
              {metadata.description}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
