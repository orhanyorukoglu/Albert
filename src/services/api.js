const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
const API_KEY = import.meta.env.VITE_API_KEY

export function getConfig() {
  return {
    baseUrl: API_BASE_URL,
    hasApiKey: !!API_KEY,
    apiKeyPreview: API_KEY ? `${API_KEY.slice(0, 2)}***` : 'Not set',
  }
}

export async function checkConnectivity() {
  const start = performance.now()
  try {
    const response = await fetch(`${API_BASE_URL}/`, {
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
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
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
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/extract`, {
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
async function makeRequest(url, format, languagePreference) {
  const response = await fetch(`${API_BASE_URL}/api/v1/extract`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify({
      url,
      format,
      language_preference: languagePreference,
    }),
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

export async function extractTranscript(url, format = 'json', languagePreference = 'en', onRetry = null) {
  const maxRetries = 3
  const baseDelay = 2000 // 2 seconds

  let lastError = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await makeRequest(url, format, languagePreference)
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
