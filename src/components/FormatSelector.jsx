import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const FORMATS = [
  { value: 'txt', label: 'Text' },
  { value: 'json', label: 'JSON' },
  { value: 'srt', label: 'SRT' },
  { value: 'vtt', label: 'VTT' },
]

export default function FormatSelector({ value, onChange, disabled }) {
  return (
    <div className="flex items-center gap-4">
      <label htmlFor="format-selector" className="text-gray-700 font-medium">
        Transcript Format:
      </label>
      <Select value={value} onValueChange={onChange} disabled={disabled} name="format">
        <SelectTrigger id="format-selector" className="w-32">
          <SelectValue placeholder="Select format" />
        </SelectTrigger>
        <SelectContent>
          {FORMATS.map((format) => (
            <SelectItem key={format.value} value={format.value}>
              {format.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
