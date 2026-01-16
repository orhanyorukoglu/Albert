const FORMATS = [
  { value: 'json', label: 'JSON' },
  { value: 'txt', label: 'TXT' },
  { value: 'srt', label: 'SRT' },
  { value: 'vtt', label: 'VTT' },
]

export default function FormatSelector({ value, onChange, disabled }) {
  return (
    <div className="flex items-center gap-6">
      <span className="text-gray-700 font-medium">Format:</span>
      <div className="flex gap-4">
        {FORMATS.map((format) => (
          <label
            key={format.value}
            className={`flex items-center gap-2 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input
              type="radio"
              name="format"
              value={format.value}
              checked={value === format.value}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              className="w-4 h-4 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-gray-700">{format.label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
