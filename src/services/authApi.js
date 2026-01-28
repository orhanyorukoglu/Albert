import { getApiBaseUrl } from './api'

const API_KEY = import.meta.env.VITE_API_KEY

/**
 * Make an authenticated fetch request with proper error handling.
 * Catches network errors and includes the server URL in all error messages.
 */
async function authFetch(url, options) {
  const baseUrl = getApiBaseUrl()
  let response
  try {
    response = await fetch(url, options)
  } catch (err) {
    const error = new Error(
      `Cannot reach backend server at ${baseUrl}. Make sure the server is running.`
    )
    error.status = 0
    throw error
  }

  if (!response.ok) {
    const error = await parseErrorResponse(response, baseUrl)
    throw error
  }

  return response.json()
}

/**
 * Register a new user
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} name - User's display name (optional)
 * @returns {Promise<{access_token: string, refresh_token: string, token_type: string, user: object}>}
 */
export async function register(email, password, name = null) {
  const body = { email, password }
  if (name) body.name = name
  const baseUrl = getApiBaseUrl()

  return authFetch(`${baseUrl}/api/v1/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify(body),
  })
}

/**
 * Login with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<{access_token: string, refresh_token: string, token_type: string, user: object}>}
 */
export async function login(email, password) {
  const baseUrl = getApiBaseUrl()

  return authFetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify({ email, password }),
  })
}

/**
 * Refresh the access token using a refresh token
 * @param {string} refreshToken - The refresh token
 * @returns {Promise<{access_token: string, refresh_token: string, token_type: string}>}
 */
export async function refreshToken(refreshToken) {
  const baseUrl = getApiBaseUrl()

  return authFetch(`${baseUrl}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
}

/**
 * Get the current authenticated user's information
 * @param {string} accessToken - The access token
 * @returns {Promise<{id: string, email: string, name: string, created_at: string}>}
 */
export async function getCurrentUser(accessToken) {
  const baseUrl = getApiBaseUrl()

  return authFetch(`${baseUrl}/api/v1/auth/me`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'X-API-Key': API_KEY,
    },
  })
}

/**
 * Parse error response from the API
 * @param {Response} response - Fetch response object
 * @param {string} baseUrl - The backend server URL used for the request
 * @returns {Error}
 */
async function parseErrorResponse(response, baseUrl) {
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

  switch (response.status) {
    case 400:
      error.message = errorDetail || 'Invalid request.'
      break
    case 401:
      error.message = errorDetail || 'Invalid credentials.'
      break
    case 403:
      error.message = errorDetail || 'Access denied.'
      break
    case 404:
      error.message = `Auth endpoint not found on ${baseUrl}. The server may not support authentication.`
      break
    case 409:
      error.message = errorDetail || 'User already exists.'
      break
    case 422:
      error.message = errorDetail || 'Validation error.'
      break
    default:
      error.message = errorDetail || `Error ${response.status} from ${baseUrl}`
  }

  return error
}
