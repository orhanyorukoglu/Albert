import { useState } from 'react'
import { Copy, Download, Check } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import LanguageSelector from '@/components/LanguageSelector'
import TranscriptContent from './TranscriptContent'

const FORMATS = [
  { value: 'txt', label: 'Txt' },
  { value: 'srt', label: 'SRT' },
  { value: 'vtt', label: 'VTT' },
  { value: 'json', label: 'JSON' },
]

export default function TranscriptSection({
  transcript,
  format,
  onFormatChange,
  availableLanguages,
  selectedLanguage,
  onLanguageChange,
  onCopy,
  onDownload,
  disabled,
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await onCopy()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="overflow-hidden">
      {/* Header row with label, format toggle, and actions */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-between py-3 px-4">
          {/* Left side: Label, format toggle */}
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-medium text-gray-700">Transcript Format</h2>
            <ToggleGroup
              type="single"
              value={format}
              onValueChange={(value) => value && onFormatChange(value)}
              disabled={disabled}
            >
              {FORMATS.map((fmt) => (
                <ToggleGroupItem
                  key={fmt.value}
                  value={fmt.value}
                  variant="outline"
                  size="sm"
                  className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                  {fmt.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          {/* Right side: Language selector, Copy, Download */}
          <div className="flex items-center gap-3">
            {availableLanguages.length > 1 && (
              <LanguageSelector
                languages={availableLanguages}
                selectedLanguage={selectedLanguage}
                onChange={onLanguageChange}
                disabled={disabled}
                compact
              />
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={disabled}
              className="gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onDownload}
              disabled={disabled}
              className="gap-1.5"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>
        </div>
      </div>

      <TranscriptContent transcript={transcript} format={format} />
    </Card>
  )
}
