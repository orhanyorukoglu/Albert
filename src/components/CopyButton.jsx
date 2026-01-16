import { useState } from 'react'

export default function CopyButton({ text, disabled }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!text || disabled) return

    try {
      const content = typeof text === 'string' ? text : JSON.stringify(text, null, 2)
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <button
      onClick={handleCopy}
      disabled={disabled || !text}
      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}
