import { useState, useEffect } from 'react'
import { getConfig, checkConnectivity, checkHealth } from '../services/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { RefreshCw, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react'

const REFRESH_RATE_SECONDS = parseInt(import.meta.env.VITE_TESTING_REFRESH_RATE, 10) || 60

function StatusBadge({ status, label }) {
  const variants = {
    ok: 'default',
    error: 'destructive',
    loading: 'secondary',
    unknown: 'outline',
  }

  const icons = {
    ok: <CheckCircle className="h-3 w-3" />,
    error: <XCircle className="h-3 w-3" />,
    loading: <Loader2 className="h-3 w-3 animate-spin" />,
  }

  return (
    <Badge variant={variants[status] || variants.unknown} className="gap-1">
      {icons[status]}
      {label}
    </Badge>
  )
}

export default function DiagnosticSidebar({ apiError }) {
  const [diagnostics, setDiagnostics] = useState({
    config: null,
    connectivity: { status: 'loading' },
    health: { status: 'loading' },
  })
  const [lastCheck, setLastCheck] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const runDiagnostics = async () => {
    setIsRefreshing(true)
    setDiagnostics(prev => ({
      ...prev,
      connectivity: { status: 'loading' },
      health: { status: 'loading' },
    }))

    const config = getConfig()
    setDiagnostics(prev => ({ ...prev, config }))

    const [connectivity, health] = await Promise.all([
      checkConnectivity(),
      checkHealth(),
    ])

    setDiagnostics(prev => ({
      ...prev,
      connectivity: { ...connectivity, status: connectivity.connected ? 'ok' : 'error' },
      health: { ...health, status: health.healthy ? 'ok' : 'error' },
    }))

    setLastCheck(new Date().toLocaleTimeString())
    setIsRefreshing(false)
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
    <div className="bg-slate-900 text-slate-100 shrink-0 border-t border-slate-700">
      <div className="flex items-center gap-6 px-6 py-3 overflow-x-auto">
        {/* Title */}
        <div className="flex items-center gap-2 shrink-0">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-300">Diagnostics</h2>
          <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50 text-[10px] px-1.5 py-0">
            TEST
          </Badge>
        </div>

        <Separator orientation="vertical" className="bg-slate-700 h-8" />

        {/* API Base URL */}
        <div className="shrink-0">
          <span className="text-[10px] text-slate-400 uppercase tracking-wide">URL</span>
          <code className="text-xs text-blue-400 ml-2">
            {diagnostics.config?.baseUrl || 'Loading...'}
          </code>
        </div>

        <Separator orientation="vertical" className="bg-slate-700 h-8" />

        {/* API Key */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-slate-400 uppercase tracking-wide">Key</span>
          <code className="text-xs text-blue-400">{diagnostics.config?.apiKeyPreview || '...'}</code>
          {diagnostics.config?.hasApiKey ? (
            <StatusBadge status="ok" label="Set" />
          ) : (
            <StatusBadge status="error" label="Missing" />
          )}
        </div>

        <Separator orientation="vertical" className="bg-slate-700 h-8" />

        {/* Server Connectivity */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-slate-400 uppercase tracking-wide">Server</span>
          <StatusBadge
            status={diagnostics.connectivity.status}
            label={diagnostics.connectivity.status === 'loading' ? 'Checking...' :
                   diagnostics.connectivity.connected ? 'Connected' : 'Failed'}
          />
          {diagnostics.connectivity.latency && (
            <span className="text-xs text-slate-400">{diagnostics.connectivity.latency}ms</span>
          )}
          {diagnostics.connectivity.error && (
            <span className="text-xs text-red-400">{diagnostics.connectivity.error}</span>
          )}
        </div>

        <Separator orientation="vertical" className="bg-slate-700 h-8" />

        {/* Health Check */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-slate-400 uppercase tracking-wide">Health</span>
          <StatusBadge
            status={diagnostics.health.status}
            label={diagnostics.health.status === 'loading' ? 'Checking...' :
                   diagnostics.health.healthy ? 'Healthy' : 'Unhealthy'}
          />
          {diagnostics.health.error && (
            <span className="text-xs text-red-400">{diagnostics.health.error}</span>
          )}
        </div>

        {/* API Error */}
        {apiError && (
          <>
            <Separator orientation="vertical" className="bg-slate-700 h-8" />
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Error
              </Badge>
              <span className="text-xs text-red-400 max-w-xs truncate">{apiError}</span>
            </div>
          </>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Refresh */}
        <div className="flex items-center gap-2 shrink-0">
          {lastCheck && (
            <span className="text-[10px] text-slate-500">{lastCheck}</span>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={runDiagnostics}
            disabled={isRefreshing}
            className="h-7 px-3 text-xs"
          >
            {isRefreshing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            Refresh
          </Button>
        </div>
      </div>
    </div>
  )
}
