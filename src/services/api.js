const API_KEY = import.meta.env.VITE_API_KEY

// Available API environments
export const API_ENVIRONMENTS = {
  production: {
    name: 'Production',
    url: import.meta.env.VITE_API_BASE_URL || 'https://ytte-production.up.railway.app',
  },
  local: {
    name: 'Local',
    url: import.meta.env.VITE_API_LOCAL_URL || 'http://localhost:8000',
  },
}

const STORAGE_KEY = 'albert_api_environment'

// Get the current environment from localStorage or default to production
export function getApiEnvironment() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored && API_ENVIRONMENTS[stored]) {
    return stored
  }
  return 'production'
}

// Set the API environment
export function setApiEnvironment(env) {
  if (API_ENVIRONMENTS[env]) {
    localStorage.setItem(STORAGE_KEY, env)
    return true
  }
  return false
}

// Get the current API base URL
function getApiBaseUrl() {
  const env = getApiEnvironment()
  return API_ENVIRONMENTS[env].url
}

export function getConfig() {
  const env = getApiEnvironment()
  return {
    environment: env,
    environmentName: API_ENVIRONMENTS[env].name,
    baseUrl: API_ENVIRONMENTS[env].url,
    hasApiKey: !!API_KEY,
    apiKeyPreview: API_KEY ? `${API_KEY.slice(0, 2)}***` : 'Not set',
  }
}

export async function checkConnectivity() {
  const baseUrl = getApiBaseUrl()
  const start = performance.now()
  try {
    const response = await fetch(`${baseUrl}/`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    })
    const latency = Math.round(performance.now() - start)
    return {
      connected: true,
      latency,
      status: response.status,
    }
  } catch (error) {
    return {
      connected: false,
      error: error.message,
      latency: null,
    }
  }
}

export async function checkHealth() {
  const baseUrl = getApiBaseUrl()
  try {
    const response = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    })
    if (response.ok) {
      const data = await response.json()
      return { healthy: true, data }
    }
    return { healthy: false, status: response.status }
  } catch (error) {
    return { healthy: false, error: error.message }
  }
}

export async function checkApiAuth() {
  const baseUrl = getApiBaseUrl()
  try {
    const response = await fetch(`${baseUrl}/api/v1/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify({ url: '', format: 'json' }),
      signal: AbortSignal.timeout(5000),
    })
    // 422 means auth passed but validation failed (expected)
    // 401 means auth failed
    return {
      authenticated: response.status !== 401,
      status: response.status,
    }
  } catch (error) {
    return { authenticated: false, error: error.message }
  }
}

// Helper function to delay execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// Helper function to make a single API request
async function makeRequest(url, format, options = {}) {
  const baseUrl = getApiBaseUrl()
  const { languagePreference, fetchAllLanguages } = options

  const body = { url, format }
  if (fetchAllLanguages) {
    body.fetch_all_languages = true
  } else if (languagePreference) {
    body.language_preference = languagePreference
  }

  const response = await fetch(`${baseUrl}/api/v1/extract`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    // Try to get error details from the API response
    let errorDetail = ''
    try {
      const errorData = await response.json()
      errorDetail = errorData.detail || errorData.message || errorData.error || JSON.stringify(errorData)
    } catch {
      try {
        errorDetail = await response.text()
      } catch {
        errorDetail = ''
      }
    }

    const error = new Error()
    error.status = response.status
    error.detail = errorDetail

    // Handle specific status codes
    switch (response.status) {
      case 400:
        error.message = `Bad request: ${errorDetail || 'Invalid request parameters.'}`
        error.retryable = false
        break
      case 401:
        error.message = `Authentication failed: ${errorDetail || 'Invalid API key.'}`
        error.retryable = false
        break
      case 403:
        error.message = `Access denied: ${errorDetail || 'You do not have permission to access this resource.'}`
        error.retryable = false
        break
      case 404:
        error.message = `Not found: ${errorDetail || 'Could not find transcript for this video.'}`
        error.retryable = false
        break
      case 422:
        error.message = `Validation error: ${errorDetail || 'Invalid YouTube URL or parameters.'}`
        error.retryable = false
        break
      case 429:
        error.message = `Rate limited: ${errorDetail || 'Too many requests. Please wait a moment.'}`
        error.retryable = true
        break
      case 500:
        error.message = `Server error: ${errorDetail || 'Internal server error. Please try again later.'}`
        error.retryable = true
        break
      case 502:
        error.message = `Gateway error: ${errorDetail || 'Server is temporarily unavailable.'}`
        error.retryable = true
        break
      case 503:
        error.message = `Service unavailable: ${errorDetail || 'Server is under maintenance. Please try again later.'}`
        error.retryable = true
        break
      default:
        error.message = `Error ${response.status}: ${errorDetail || 'An unexpected error occurred.'}`
        error.retryable = true
    }

    throw error
  }

  return response.json()
}

export async function extractTranscript(url, format = 'json', options = {}, onRetry = null) {
  const maxRetries = 3
  const baseDelay = 2000 // 2 seconds

  let lastError = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await makeRequest(url, format, options)
    } catch (err) {
      lastError = err

      // Network errors
      if (err.name === 'TypeError') {
        lastError = new Error('Network error: Unable to connect to the server. Please check your internet connection.')
        lastError.retryable = true
        lastError.status = 0
      }

      // Don't retry non-retryable errors
      if (lastError.retryable === false) {
        throw lastError
      }

      // Don't retry if this was the last attempt
      if (attempt === maxRetries) {
        break
      }

      // Calculate backoff delay (exponential: 2s, 4s, 8s)
      const backoffDelay = baseDelay * Math.pow(2, attempt)

      // Notify about retry if callback provided
      if (onRetry) {
        onRetry({
          attempt: attempt + 1,
          maxRetries,
          delay: backoffDelay,
          error: lastError.message,
        })
      }

      await delay(backoffDelay)
    }
  }

  // All retries exhausted
  lastError.retriesExhausted = true
  throw lastError
}

export async function getThumbnail(url, quality = 'hq') {
  const baseUrl = getApiBaseUrl()
  const params = new URLSearchParams({ url, quality })

  const response = await fetch(`${baseUrl}/api/v1/thumbnail?${params}`, {
    method: 'GET',
    headers: {
      'X-API-Key': API_KEY,
    },
  })

  if (!response.ok) {
    let errorDetail = ''
    try {
      const errorData = await response.json()
      errorDetail = errorData.detail || errorData.message || ''
    } catch {
      // Ignore parse errors
    }
    throw new Error(errorDetail || `Failed to fetch thumbnail (${response.status})`)
  }

  return response.json()
}

export async function getMetadata(url) {
  const baseUrl = getApiBaseUrl()
  const params = new URLSearchParams({ url })

  const response = await fetch(`${baseUrl}/api/v1/metadata?${params}`, {
    method: 'GET',
    headers: {
      'X-API-Key': API_KEY,
    },
  })

  if (!response.ok) {
    let errorDetail = ''
    try {
      const errorData = await response.json()
      errorDetail = errorData.detail || errorData.message || ''
    } catch {
      // Ignore parse errors
    }
    throw new Error(errorDetail || `Failed to fetch metadata (${response.status})`)
  }

  return response.json()
}
