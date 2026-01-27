import { ScrollArea } from '@/components/ui/scroll-area'
import { getFormattedContent, segmentsToParagraphs } from '@/utils/formatters'

export default function TranscriptContent({ transcript, format }) {
  if (!transcript) return null

  // For text format with segments, render as paragraphs
  if (format === 'txt' && transcript.segments) {
    const paragraphs = segmentsToParagraphs(transcript.segments)

    return (
      <ScrollArea className="h-[500px] w-full">
        <div className="px-5 py-3 space-y-4">
          {paragraphs.map((paragraph, index) => (
            <p
              key={index}
              className="text-base leading-relaxed text-gray-700"
            >
              {paragraph}
            </p>
          ))}
        </div>
      </ScrollArea>
    )
  }

  // For other formats, use the string content
  const content = getFormattedContent(transcript, format)

  const isMonospace = format === 'srt' || format === 'vtt' || format === 'json'

  return (
    <ScrollArea className="h-[500px] w-full">
      <div
        className={`px-5 py-3 whitespace-pre-wrap ${
          isMonospace
            ? 'font-mono text-sm text-gray-600'
            : 'text-base leading-relaxed text-gray-700'
        }`}
      >
        {content}
      </div>
    </ScrollArea>
  )
}
