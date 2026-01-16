import { useState, useEffect } from 'react'
import { getConfig, checkConnectivity, checkHealth, checkApiAuth } from '../services/api'

const REFRESH_RATE_SECONDS = parseInt(import.meta.env.VITE_TESTING_REFRESH_RATE, 10) || 60

function StatusBadge({ status, label }) {
  const colors = {
    ok: 'bg-green-100 text-green-800',
    error: 'bg-red-100 text-red-800',
    loading: 'bg-yellow-100 text-yellow-800',
    unknown: 'bg-gray-100 text-gray-800',
  }

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded ${colors[status] || colors.unknown}`}>
      {label}
    </span>
  )
}

function DiagnosticItem({ label, children }) {
  return (
    <div className="py-2 border-b border-gray-700 last:border-0">
      <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</div>
      <div className="text-sm">{children}</div>
    </div>
  )
}

export default function DiagnosticSidebar({ apiError, retryInfo }) {
  const [diagnostics, setDiagnostics] = useState({
    config: null,
    connectivity: { status: 'loading' },
    health: { status: 'loading' },
    auth: { status: 'loading' },
  })
  const [lastCheck, setLastCheck] = useState(null)

  const runDiagnostics = async () => {
    setDiagnostics(prev => ({
      ...prev,
      connectivity: { status: 'loading' },
      health: { status: 'loading' },
      auth: { status: 'loading' },
    }))

    const config = getConfig()
    setDiagnostics(prev => ({ ...prev, config }))

    const [connectivity, health, auth] = await Promise.all([
      checkConnectivity(),
      checkHealth(),
      checkApiAuth(),
    ])

    setDiagnostics(prev => ({
      ...prev,
      connectivity: { ...connectivity, status: connectivity.connected ? 'ok' : 'error' },
      health: { ...health, status: health.healthy ? 'ok' : 'error' },
      auth: { ...auth, status: auth.authenticated ? 'ok' : 'error' },
    }))

    setLastCheck(new Date().toLocaleTimeString())
  }

  useEffect(() => {
    runDiagnostics()

    const interval = setInterval(() => {
      runDiagnostics()
    }, REFRESH_RATE_SECONDS * 1000)

    return () => clearInterval(interval)
  }, [])

  // Refresh when apiError changes
  useEffect(() => {
    if (apiError) {
      runDiagnostics()
    }
  }, [apiError])

  return (
    <div className="w-64 bg-gray-900 text-white p-4 flex flex-col h-screen overflow-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-gray-300">Diagnostics</h2>
        <span className="px-2 py-0.5 text-xs bg-yellow-500 text-black rounded font-medium">TEST</span>
      </div>

      <div className="flex-1 space-y-1">
        <DiagnosticItem label="API Base URL">
          <code className="text-xs break-all text-blue-300">
            {diagnostics.config?.baseUrl || 'Loading...'}
          </code>
        </DiagnosticItem>

        <DiagnosticItem label="API Key">
          <div className="flex items-center gap-2">
            <code className="text-xs text-blue-300">{diagnostics.config?.apiKeyPreview || '...'}</code>
            {diagnostics.config?.hasApiKey ? (
              <StatusBadge status="ok" label="Set" />
            ) : (
              <StatusBadge status="error" label="Missing" />
            )}
          </div>
        </DiagnosticItem>

        <DiagnosticItem label="Server Connectivity">
          <div className="flex items-center gap-2">
            <StatusBadge
              status={diagnostics.connectivity.status}
              label={diagnostics.connectivity.status === 'loading' ? 'Checking...' :
                     diagnostics.connectivity.connected ? 'Connected' : 'Failed'}
            />
            {diagnostics.connectivity.latency && (
              <span className="text-xs text-gray-400">{diagnostics.connectivity.latency}ms</span>
            )}
          </div>
          {diagnostics.connectivity.error && (
            <p className="text-xs text-red-400 mt-1">{diagnostics.connectivity.error}</p>
          )}
        </DiagnosticItem>

        <DiagnosticItem label="Health Check">
          <div className="flex items-center gap-2">
            <StatusBadge
              status={diagnostics.health.status}
              label={diagnostics.health.status === 'loading' ? 'Checking...' :
                     diagnostics.health.healthy ? 'Healthy' : 'Unhealthy'}
            />
          </div>
          {diagnostics.health.data && (
            <pre className="text-xs text-gray-400 mt-1 overflow-auto max-h-20">
              {JSON.stringify(diagnostics.health.data, null, 2)}
            </pre>
          )}
          {diagnostics.health.error && (
            <p className="text-xs text-red-400 mt-1">{diagnostics.health.error}</p>
          )}
        </DiagnosticItem>

        <DiagnosticItem label="API Authentication">
          <div className="flex items-center gap-2">
            <StatusBadge
              status={diagnostics.auth.status}
              label={diagnostics.auth.status === 'loading' ? 'Checking...' :
                     diagnostics.auth.authenticated ? 'Valid' : 'Invalid'}
            />
            {diagnostics.auth.status !== 'loading' && (
              <span className="text-xs text-gray-400">HTTP {diagnostics.auth.status}</span>
            )}
          </div>
          {diagnostics.auth.error && (
            <p className="text-xs text-red-400 mt-1">{diagnostics.auth.error}</p>
          )}
        </DiagnosticItem>

        {retryInfo && (
          <DiagnosticItem label="Retry Status">
            <div className="flex items-center gap-2">
              <StatusBadge status="loading" label="Retrying..." />
            </div>
            <p className="text-xs text-yellow-400 mt-1">
              Attempt {retryInfo.attempt}/{retryInfo.maxRetries} - waiting {retryInfo.delay / 1000}s
            </p>
            <p className="text-xs text-gray-400 mt-1">{retryInfo.error}</p>
          </DiagnosticItem>
        )}

        {apiError && !retryInfo && (
          <DiagnosticItem label="Last API Error">
            <div className="flex items-center gap-2">
              <StatusBadge status="error" label="Failed" />
            </div>
            <p className="text-xs text-red-400 mt-1 break-words">{apiError}</p>
          </DiagnosticItem>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-700">
        <button
          onClick={runDiagnostics}
          className="w-full px-3 py-2 text-xs font-medium bg-gray-700 hover:bg-gray-600 rounded transition-colors"
        >
          Refresh Diagnostics
        </button>
        {lastCheck && (
          <p className="text-xs text-gray-500 mt-2 text-center">Last check: {lastCheck}</p>
        )}
      </div>
    </div>
  )
}
