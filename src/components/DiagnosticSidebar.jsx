import { useState, useEffect } from 'react'
import { getConfig, checkConnectivity, checkHealth, checkApiAuth } from '../services/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
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

function DiagnosticItem({ label, children }) {
  return (
    <div className="py-3">
      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">{label}</div>
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
  const [isRefreshing, setIsRefreshing] = useState(false)

  const runDiagnostics = async () => {
    setIsRefreshing(true)
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
    <div className="w-64 bg-slate-900 text-slate-100 flex flex-col h-screen">
      <div className="flex items-center justify-between p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Diagnostics</h2>
        <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
          TEST
        </Badge>
      </div>

      <Separator className="bg-slate-700" />

      <ScrollArea className="flex-1 px-4">
        <div className="divide-y divide-slate-700">
          <DiagnosticItem label="API Base URL">
            <code className="text-xs break-all text-blue-400">
              {diagnostics.config?.baseUrl || 'Loading...'}
            </code>
          </DiagnosticItem>

          <DiagnosticItem label="API Key">
            <div className="flex items-center gap-2">
              <code className="text-xs text-blue-400">{diagnostics.config?.apiKeyPreview || '...'}</code>
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
                <span className="text-xs text-slate-400">{diagnostics.connectivity.latency}ms</span>
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
              <pre className="text-xs text-slate-400 mt-1 overflow-auto max-h-20">
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
                <span className="text-xs text-slate-400">HTTP {diagnostics.auth.status}</span>
              )}
            </div>
            {diagnostics.auth.error && (
              <p className="text-xs text-red-400 mt-1">{diagnostics.auth.error}</p>
            )}
          </DiagnosticItem>

          {retryInfo && (
            <DiagnosticItem label="Retry Status">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Retrying...
                </Badge>
              </div>
              <p className="text-xs text-yellow-400 mt-1">
                Attempt {retryInfo.attempt}/{retryInfo.maxRetries} - waiting {retryInfo.delay / 1000}s
              </p>
              <p className="text-xs text-slate-400 mt-1">{retryInfo.error}</p>
            </DiagnosticItem>
          )}

          {apiError && !retryInfo && (
            <DiagnosticItem label="Last API Error">
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Failed
                </Badge>
              </div>
              <p className="text-xs text-red-400 mt-1 break-words">{apiError}</p>
            </DiagnosticItem>
          )}
        </div>
      </ScrollArea>

      <Separator className="bg-slate-700" />

      <div className="p-4">
        <Button
          variant="secondary"
          size="sm"
          onClick={runDiagnostics}
          disabled={isRefreshing}
          className="w-full"
        >
          {isRefreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh Diagnostics
        </Button>
        {lastCheck && (
          <p className="text-xs text-slate-500 mt-2 text-center">Last check: {lastCheck}</p>
        )}
      </div>
    </div>
  )
}
