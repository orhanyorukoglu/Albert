import streamSaver from 'streamsaver'

export default function DownloadButton({ content, format, disabled }) {
  const handleDownload = async () => {
    if (!content || disabled) return

    const text = typeof content === 'string' ? content : JSON.stringify(content, null, 2)
    const filename = `transcript.${format}`

    // Use StreamSaver for better Chrome compatibility
    const blob = new Blob([text], { type: 'text/plain' })
    const fileStream = streamSaver.createWriteStream(filename, {
      size: blob.size
    })

    const readableStream = blob.stream()

    // Use pipeTo if available, otherwise manual pipe
    if (readableStream.pipeTo) {
      await readableStream.pipeTo(fileStream)
    } else {
      const writer = fileStream.getWriter()
      const reader = readableStream.getReader()

      const pump = async () => {
        const { done, value } = await reader.read()
        if (done) {
          writer.close()
          return
        }
        await writer.write(value)
        await pump()
      }

      await pump()
    }
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
