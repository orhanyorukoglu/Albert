export default function DownloadButton({ content, format, disabled }) {
  const isChrome = /Chrome/.test(navigator.userAgent) && !/Edg/.test(navigator.userAgent)

  // Hide download button for Chrome users due to blob URL limitations
  if (isChrome) {
    return null
  }

  const handleDownload = () => {
    if (!content || disabled) return

    const text = typeof content === 'string' ? content : JSON.stringify(content, null, 2)
    const filename = `transcript.${format}`

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <button
      onClick={handleDownload}
      disabled={disabled || !content}
      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      Download
    </button>
  )
}
