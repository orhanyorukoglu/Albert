export default function ErrorMessage({ message, onDismiss }) {
  if (!message) return null

  return (
    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
      <p className="text-red-700">{message}</p>
      <button
        onClick={onDismiss}
        className="text-red-500 hover:text-red-700 font-medium"
      >
        Dismiss
      </button>
    </div>
  )
}
