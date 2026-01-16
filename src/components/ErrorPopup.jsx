export default function ErrorPopup({ error, onClose }) {
  if (!error) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
        <div className="bg-red-600 px-4 py-3">
          <h3 className="text-white font-semibold text-lg">Error</h3>
        </div>
        <div className="p-4">
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
