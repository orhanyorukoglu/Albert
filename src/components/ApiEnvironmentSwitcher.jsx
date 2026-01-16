import { useState, useEffect } from 'react'
import { Switch } from '@/components/ui/switch'
import { getApiEnvironment, setApiEnvironment, API_ENVIRONMENTS } from '@/services/api'

export default function ApiEnvironmentSwitcher({ onEnvironmentChange }) {
  const [isLocal, setIsLocal] = useState(getApiEnvironment() === 'local')

  useEffect(() => {
    // Sync state with localStorage on mount
    setIsLocal(getApiEnvironment() === 'local')
  }, [])

  const handleToggle = (checked) => {
    const newEnv = checked ? 'local' : 'production'
    setApiEnvironment(newEnv)
    setIsLocal(checked)
    if (onEnvironmentChange) {
      onEnvironmentChange(newEnv)
    }
  }

  const currentEnv = isLocal ? API_ENVIRONMENTS.local : API_ENVIRONMENTS.production

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
      <span className={`text-sm font-medium ${!isLocal ? 'text-blue-600' : 'text-gray-500'}`}>
        Production
      </span>
      <Switch
        checked={isLocal}
        onCheckedChange={handleToggle}
      />
      <span className={`text-sm font-medium ${isLocal ? 'text-green-600' : 'text-gray-500'}`}>
        Local
      </span>
      <span className="text-xs text-gray-400 ml-2 hidden sm:inline">
        ({currentEnv.url})
      </span>
    </div>
  )
}
