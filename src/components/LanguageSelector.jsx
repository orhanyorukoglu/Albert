import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

function LanguageSelector({ languages, selectedLanguage, onChange, disabled, compact }) {
  if (!languages || languages.length === 0) return null

  // Sort languages: manual captions first, then auto-generated
  const sortedLanguages = [...languages].sort((a, b) => {
    // English first
    if (a.code === 'en' && !a.is_generated && (b.code !== 'en' || b.is_generated)) return -1
    if (b.code === 'en' && !b.is_generated && (a.code !== 'en' || a.is_generated)) return 1
    // Then other manual captions
    if (!a.is_generated && b.is_generated) return -1
    if (a.is_generated && !b.is_generated) return 1
    // Then alphabetically by name
    return a.name.localeCompare(b.name)
  })

  const handleValueChange = (value) => {
    if (!value) return
    // Value format: "code-auto" or "code-manual"
    const [code, type] = value.split('-')
    const isGenerated = type === 'auto'
    onChange(code, isGenerated)
  }

  // Create current value from selectedLanguage (use empty string instead of undefined for controlled component)
  const matchedLang = sortedLanguages.find(l => l.code === selectedLanguage)
  const currentValue = matchedLang
    ? `${selectedLanguage}-${matchedLang.is_generated ? 'auto' : 'manual'}`
    : ''

  // Compact mode: dropdown selector for transcript header
  if (compact) {
    return (
      <Select value={currentValue} onValueChange={handleValueChange} disabled={disabled}>
        <SelectTrigger className="w-auto min-w-[120px] h-8 text-sm">
          <SelectValue placeholder="Language" />
        </SelectTrigger>
        <SelectContent>
          {sortedLanguages.map((lang) => {
            const uniqueValue = `${lang.code}-${lang.is_generated ? 'auto' : 'manual'}`
            return (
              <SelectItem key={uniqueValue} value={uniqueValue}>
                {lang.name}
                {lang.is_generated && ' (auto)'}
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    )
  }

  return (
    <div className="mt-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Transcript Language
      </label>
      <ToggleGroup
        type="single"
        value={currentValue}
        onValueChange={handleValueChange}
        disabled={disabled}
        className="flex-wrap justify-start gap-2"
        spacing="default"
      >
        {sortedLanguages.map((lang) => {
          const uniqueValue = `${lang.code}-${lang.is_generated ? 'auto' : 'manual'}`

          return (
            <ToggleGroupItem
              key={uniqueValue}
              value={uniqueValue}
              variant="outline"
              size="sm"
              className="rounded-full data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              {lang.name}
              {lang.is_generated && (
                <span className="ml-1 text-xs opacity-75">(auto)</span>
              )}
            </ToggleGroupItem>
          )
        })}
      </ToggleGroup>
    </div>
  )
}

export default LanguageSelector
