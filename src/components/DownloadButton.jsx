import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

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
    <Button
      variant="outline"
      size="sm"
      onClick={handleDownload}
      disabled={disabled || !content}
    >
      <Download className="h-4 w-4" />
      Download
    </Button>
  )
}
