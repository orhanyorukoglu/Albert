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

export async function extractTranscript(url, format = 'json', languagePreference = 'en') {
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
    if (response.status === 429) {
      throw new Error('Too many requests. Please wait a moment.')
    }
    if (response.status === 404) {
      throw new Error('Could not find transcript for this video.')
    }
    if (response.status === 401) {
      throw new Error('Invalid API key.')
    }
    throw new Error('Failed to extract transcript. Please try again.')
  }

  return response.json()
}
