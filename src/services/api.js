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

// Default environment from .env (production or local)
const DEFAULT_ENVIRONMENT = import.meta.env.VITE_API_ENVIRONMENT || 'production'

// Get the current environment from localStorage or default from .env
export function getApiEnvironment() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored && API_ENVIRONMENTS[stored]) {
    return stored
  }
  return DEFAULT_ENVIRONMENT
}

// Get the default environment from .env
export function getDefaultEnvironment() {
  return DEFAULT_ENVIRONMENT
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
export function getApiBaseUrl() {
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

// Helper function to make a single API request
async function makeRequest(url, format, options = {}, getAccessToken = null) {
  const baseUrl = getApiBaseUrl()
  const { fetchAllLanguages = true } = options

  // Request body - fetch_all_languages returns all transcripts at once
  const body = { url, format, fetch_all_languages: fetchAllLanguages }

  // Build headers
  const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
  }

  // Add Authorization header if getAccessToken is provided
  if (getAccessToken) {
    try {
      const token = await getAccessToken()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    } catch {
      // If token retrieval fails, continue without it
      // The request will proceed with just the API key
    }
  }

  const response = await fetch(`${baseUrl}/api/v1/extract`, {
    method: 'POST',
    headers,
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

export async function extractTranscript(url, format = 'json', options = {}, getAccessToken = null) {
  try {
    return await makeRequest(url, format, options, getAccessToken)
  } catch (err) {
    if (err.name === 'TypeError') {
      const baseUrl = getApiBaseUrl()
      const error = new Error(`Cannot reach backend server at ${baseUrl}. Make sure the server is running.`)
      error.status = 0
      throw error
    }
    throw err
  }
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

/**
 * List user's saved transcripts.
 * Requires authentication (JWT).
 */
export async function listTranscripts({ limit = 20, offset = 0 } = {}, getAccessToken) {
  const baseUrl = getApiBaseUrl()

  const headers = {
    'X-API-Key': API_KEY,
  }

  // Add auth token if available
  if (getAccessToken) {
    try {
      const token = await getAccessToken()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      } else {
        console.warn('listTranscripts: No token returned from getAccessToken')
      }
    } catch (err) {
      console.error('listTranscripts: Error getting access token:', err)
    }
  } else {
    console.warn('listTranscripts: No getAccessToken function provided')
  }

  const response = await fetch(`${baseUrl}/api/v1/transcripts?limit=${limit}&offset=${offset}`, {
    method: 'GET',
    headers,
  })

  if (!response.ok) {
    let errorDetail = ''
    try {
      const errorData = await response.json()
      errorDetail = errorData.detail || errorData.message || ''
    } catch {
      // Ignore parse errors
    }
    throw new Error(errorDetail || `Failed to fetch transcripts (${response.status})`)
  }

  return response.json()
}

/**
 * Delete a saved transcript.
 * Requires authentication (JWT).
 */
export async function deleteTranscript(transcriptId, getAccessToken) {
  const baseUrl = getApiBaseUrl()

  const headers = {
    'X-API-Key': API_KEY,
  }

  // Add auth token if available
  if (getAccessToken) {
    try {
      const token = await getAccessToken()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    } catch (err) {
      console.error('deleteTranscript: Error getting access token:', err)
    }
  }

  const response = await fetch(`${baseUrl}/api/v1/transcripts/${transcriptId}`, {
    method: 'DELETE',
    headers,
  })

  if (!response.ok) {
    let errorDetail = ''
    try {
      const errorData = await response.json()
      errorDetail = errorData.detail || errorData.message || ''
    } catch {
      // Ignore parse errors
    }
    throw new Error(errorDetail || `Failed to delete transcript (${response.status})`)
  }

  return true
}

// ============================================
// Search API Functions
// ============================================

/**
 * Search transcripts and notes by query.
 * Requires authentication (JWT).
 * Falls back to client-side filtering if API not available.
 */
export async function searchTranscripts(query, getAccessToken) {
  const baseUrl = getApiBaseUrl()

  const headers = {
    'X-API-Key': API_KEY,
  }

  if (getAccessToken) {
    try {
      const token = await getAccessToken()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    } catch (err) {
      console.error('searchTranscripts: Error getting access token:', err)
    }
  }

  const params = new URLSearchParams({ q: query, limit: '50' })

  const response = await fetch(`${baseUrl}/api/v1/transcripts/search?${params}`, {
    method: 'GET',
    headers,
  })

  if (!response.ok) {
    // If 404, the search endpoint doesn't exist yet - return null to trigger client-side fallback
    if (response.status === 404) {
      return null
    }
    let errorDetail = ''
    try {
      const errorData = await response.json()
      errorDetail = errorData.detail || errorData.message || ''
    } catch {
      // Ignore parse errors
    }
    throw new Error(errorDetail || `Search failed (${response.status})`)
  }

  return response.json()
}

// ============================================
// Notes API Functions
// ============================================

/**
 * Create a new note for a transcript.
 * Requires authentication (JWT).
 */
export async function createNote(transcriptId, content, getAccessToken) {
  const baseUrl = getApiBaseUrl()

  const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
  }

  if (getAccessToken) {
    try {
      const token = await getAccessToken()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    } catch (err) {
      console.error('createNote: Error getting access token:', err)
    }
  }

  const response = await fetch(`${baseUrl}/api/v1/notes`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      transcript_id: transcriptId,
      content: content,
    }),
  })

  if (!response.ok) {
    let errorDetail = ''
    try {
      const errorData = await response.json()
      errorDetail = errorData.detail || errorData.message || ''
    } catch {
      // Ignore parse errors
    }
    throw new Error(errorDetail || `Failed to create note (${response.status})`)
  }

  return response.json()
}

/**
 * Get all notes for a specific transcript.
 * Requires authentication (JWT).
 */
export async function getNotesByTranscript(transcriptId, getAccessToken) {
  const baseUrl = getApiBaseUrl()

  const headers = {
    'X-API-Key': API_KEY,
  }

  if (getAccessToken) {
    try {
      const token = await getAccessToken()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    } catch (err) {
      console.error('getNotesByTranscript: Error getting access token:', err)
    }
  }

  const response = await fetch(`${baseUrl}/api/v1/notes/transcript/${transcriptId}`, {
    method: 'GET',
    headers,
  })

  if (!response.ok) {
    let errorDetail = ''
    try {
      const errorData = await response.json()
      errorDetail = errorData.detail || errorData.message || ''
    } catch {
      // Ignore parse errors
    }
    throw new Error(errorDetail || `Failed to fetch notes (${response.status})`)
  }

  return response.json()
}

/**
 * Update a note's content.
 * Requires authentication (JWT).
 */
export async function updateNote(noteId, content, getAccessToken) {
  const baseUrl = getApiBaseUrl()

  const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
  }

  if (getAccessToken) {
    try {
      const token = await getAccessToken()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    } catch (err) {
      console.error('updateNote: Error getting access token:', err)
    }
  }

  const response = await fetch(`${baseUrl}/api/v1/notes/${noteId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ content }),
  })

  if (!response.ok) {
    let errorDetail = ''
    try {
      const errorData = await response.json()
      errorDetail = errorData.detail || errorData.message || ''
    } catch {
      // Ignore parse errors
    }
    throw new Error(errorDetail || `Failed to update note (${response.status})`)
  }

  return response.json()
}

/**
 * Delete a note.
 * Requires authentication (JWT).
 */
export async function deleteNote(noteId, getAccessToken) {
  const baseUrl = getApiBaseUrl()

  const headers = {
    'X-API-Key': API_KEY,
  }

  if (getAccessToken) {
    try {
      const token = await getAccessToken()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    } catch (err) {
      console.error('deleteNote: Error getting access token:', err)
    }
  }

  const response = await fetch(`${baseUrl}/api/v1/notes/${noteId}`, {
    method: 'DELETE',
    headers,
  })

  if (!response.ok) {
    let errorDetail = ''
    try {
      const errorData = await response.json()
      errorDetail = errorData.detail || errorData.message || ''
    } catch {
      // Ignore parse errors
    }
    throw new Error(errorDetail || `Failed to delete note (${response.status})`)
  }

  return true
}

// ============================================
// Analysis API Functions
// ============================================

/**
 * Trigger analysis for a transcript.
 * Requires authentication (JWT).
 */
export async function analyzeTranscript(transcriptId, getAccessToken) {
  const baseUrl = getApiBaseUrl()

  const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
  }

  if (getAccessToken) {
    try {
      const token = await getAccessToken()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    } catch (err) {
      console.error('analyzeTranscript: Error getting access token:', err)
    }
  }

  const response = await fetch(`${baseUrl}/api/v1/analysis/analyze`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ transcript_id: transcriptId }),
  })

  if (!response.ok) {
    let errorDetail = ''
    try {
      const errorData = await response.json()
      errorDetail = errorData.detail || errorData.message || ''
    } catch {
      // Ignore parse errors
    }
    throw new Error(errorDetail || `Failed to analyze transcript (${response.status})`)
  }

  return response.json()
}

/**
 * Get analysis for a specific transcript.
 * Requires authentication (JWT).
 * Returns null if no analysis exists (404).
 */
export async function getAnalysisByTranscript(transcriptId, getAccessToken) {
  const baseUrl = getApiBaseUrl()

  const headers = {
    'X-API-Key': API_KEY,
  }

  if (getAccessToken) {
    try {
      const token = await getAccessToken()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    } catch (err) {
      console.error('getAnalysisByTranscript: Error getting access token:', err)
    }
  }

  const response = await fetch(`${baseUrl}/api/v1/analysis/by-transcript/${transcriptId}`, {
    method: 'GET',
    headers,
  })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    let errorDetail = ''
    try {
      const errorData = await response.json()
      errorDetail = errorData.detail || errorData.message || ''
    } catch {
      // Ignore parse errors
    }
    throw new Error(errorDetail || `Failed to fetch analysis (${response.status})`)
  }

  return response.json()
}
