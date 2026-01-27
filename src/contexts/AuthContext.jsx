import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { login as apiLogin, register as apiRegister, refreshToken as apiRefreshToken, getCurrentUser } from '../services/authApi'

const AuthContext = createContext(null)

// Storage keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'albert_access_token',
  REFRESH_TOKEN: 'albert_refresh_token',
  USER: 'albert_user',
}

/**
 * Parse JWT token to extract payload
 * @param {string} token - JWT token string
 * @returns {object|null} - Decoded payload or null if invalid
 */
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

/**
 * Check if a JWT token is expired
 * @param {string} token - JWT token string
 * @param {number} bufferSeconds - Buffer time before actual expiration (default 60s)
 * @returns {boolean} - True if token is expired or will expire within buffer time
 */
function isTokenExpired(token, bufferSeconds = 60) {
  const payload = parseJwt(token)
  if (!payload || !payload.exp) return true

  const expirationTime = payload.exp * 1000 // Convert to milliseconds
  const currentTime = Date.now()
  const bufferTime = bufferSeconds * 1000

  return currentTime >= expirationTime - bufferTime
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [accessToken, setAccessToken] = useState(null)
  const [refreshTokenValue, setRefreshTokenValue] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Initialize auth state from localStorage
  useEffect(() => {
    const storedAccessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
    const storedRefreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
    const storedUser = localStorage.getItem(STORAGE_KEYS.USER)

    if (storedAccessToken && storedRefreshToken) {
      // Check if access token is still valid
      if (!isTokenExpired(storedAccessToken)) {
        setAccessToken(storedAccessToken)
        setRefreshTokenValue(storedRefreshToken)
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser))
          } catch {
            // Invalid stored user, will be fetched
          }
        }
      } else if (!isTokenExpired(storedRefreshToken, 0)) {
        // Access token expired but refresh token valid, attempt refresh
        setRefreshTokenValue(storedRefreshToken)
        // The token will be refreshed on first getAccessToken call
      } else {
        // Both tokens expired, clear storage
        clearAuthStorage()
      }
    }

    setIsLoading(false)
  }, [])

  // Save tokens and user to localStorage
  const saveAuthData = useCallback((tokens, userData) => {
    if (tokens.access_token) {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.access_token)
      setAccessToken(tokens.access_token)
    }
    if (tokens.refresh_token) {
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refresh_token)
      setRefreshTokenValue(tokens.refresh_token)
    }
    if (userData) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData))
      setUser(userData)
    }
  }, [])

  // Clear auth data from localStorage and state
  const clearAuthStorage = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
    localStorage.removeItem(STORAGE_KEYS.USER)
    setAccessToken(null)
    setRefreshTokenValue(null)
    setUser(null)
  }, [])

  // Login function
  const login = useCallback(async (email, password) => {
    const result = await apiLogin(email, password)
    saveAuthData(result, result.user)
    return result
  }, [saveAuthData])

  // Register function
  const register = useCallback(async (email, password, name) => {
    const result = await apiRegister(email, password, name)
    saveAuthData(result, result.user)
    return result
  }, [saveAuthData])

  // Logout function
  const logout = useCallback(() => {
    clearAuthStorage()
  }, [clearAuthStorage])

  // Get a valid access token, refreshing if necessary
  const getAccessToken = useCallback(async () => {
    // If we have a valid access token, return it
    if (accessToken && !isTokenExpired(accessToken)) {
      return accessToken
    }

    // If no refresh token, user needs to login
    if (!refreshTokenValue) {
      return null
    }

    // Prevent concurrent refresh attempts
    if (isRefreshing) {
      // Wait for the current refresh to complete
      await new Promise(resolve => setTimeout(resolve, 100))
      return accessToken
    }

    // Attempt to refresh the token
    setIsRefreshing(true)
    try {
      const result = await apiRefreshToken(refreshTokenValue)
      saveAuthData(result, null)
      setIsRefreshing(false)
      return result.access_token
    } catch (error) {
      setIsRefreshing(false)
      // Refresh failed, clear auth and require re-login
      clearAuthStorage()
      throw error
    }
  }, [accessToken, refreshTokenValue, isRefreshing, saveAuthData, clearAuthStorage])

  // Fetch current user if we have a token but no user data
  useEffect(() => {
    if (accessToken && !user && !isLoading) {
      getCurrentUser(accessToken)
        .then(userData => {
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData))
          setUser(userData)
        })
        .catch(() => {
          // If we can't get user data, token might be invalid
          // Don't clear auth here, let the next API call handle it
        })
    }
  }, [accessToken, user, isLoading])

  const value = {
    user,
    isAuthenticated: !!accessToken,
    isLoading,
    login,
    register,
    logout,
    getAccessToken,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook to access auth context
 * @returns {{
 *   user: object|null,
 *   isAuthenticated: boolean,
 *   isLoading: boolean,
 *   login: (email: string, password: string) => Promise<object>,
 *   register: (email: string, password: string, name?: string) => Promise<object>,
 *   logout: () => void,
 *   getAccessToken: () => Promise<string|null>
 * }}
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
