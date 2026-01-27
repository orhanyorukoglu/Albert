# Frontend Integration V3: Authentication + JWT-Based Persistence

## Overview

This document provides frontend integration for Albert (React + Vite) that matches the **Complete Backend Implementation Guide**.

### Key Changes from V2:
- ✅ **X-API-Key header required** on ALL requests
- ✅ **Email/password auth only** (Google OAuth deferred)
- ✅ **JWT-based auto-save** (no `persist` parameter)
- ✅ **Simplified logout** (no backend endpoint)
- ✅ **Separate user profile fetch** after login
- ✅ **Backend-compatible API contracts**

### What This Adds:
1. **Authentication UI** - Login, Register forms
2. **Auth State Management** - JWT token handling, auto-refresh
3. **Protected Routes** - Redirect unauthenticated users
4. **User Context** - Access current user throughout app
5. **API Key Management** - X-API-Key on all requests

---

## Architecture Summary

```
Authentication Flow:
1. User registers/logs in → receives JWT tokens
2. Tokens stored in localStorage
3. All API calls include X-API-Key + optional JWT
4. JWT presence determines database persistence

Persistence Rules:
- No JWT → transcript extracted but NOT saved
- With JWT → transcript auto-saved to user account
- No backend "persist" parameter needed
```

---

## Files to Create/Modify

```
src/
├── contexts/
│   └── AuthContext.jsx          # NEW: Auth state management
├── services/
│   ├── api.js                   # MODIFY: Add X-API-Key + auth headers
│   └── authApi.js               # NEW: Auth-specific API calls
├── components/
│   ├── auth/
│   │   ├── LoginForm.jsx        # NEW: Email/password login
│   │   ├── RegisterForm.jsx     # NEW: Registration form
│   │   └── AuthLayout.jsx       # NEW: Auth page wrapper
│   ├── ProtectedRoute.jsx       # NEW: Route guard
│   └── UserMenu.jsx             # NEW: User dropdown in header
├── pages/
│   ├── LoginPage.jsx            # NEW: Login page
│   └── RegisterPage.jsx         # NEW: Registration page
├── hooks/
│   └── useAuth.js               # NEW: Auth hook
└── App.jsx                      # MODIFY: Add auth routes
```

---

## Part 1: Environment Variables

### File: `.env` (Frontend)

```env
# API Base URL
VITE_API_URL=http://localhost:8000

# Shared API Key (matches backend API_SECRET_KEY)
VITE_API_KEY=4321
```

### File: `.env.production`

```env
VITE_API_URL=https://api.albert.yourdomain.com
VITE_API_KEY=4321
```

---

## Part 2: Auth API Service

### File: `src/services/authApi.js`

```javascript
/**
 * Authentication API functions.
 * All requests include X-API-Key header.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_KEY = import.meta.env.VITE_API_KEY || '4321';

/**
 * Register a new user with email/password.
 * Returns access_token and refresh_token.
 */
export async function register({ email, password, displayName }) {
  const response = await fetch(`${API_BASE}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY  // Required for all endpoints
    },
    body: JSON.stringify({
      email,
      password,
      display_name: displayName,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Registration failed');
  }

  return response.json(); // { access_token, refresh_token }
}

/**
 * Login with email/password.
 * Returns access_token and refresh_token.
 */
export async function login({ email, password }) {
  const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Login failed');
  }

  return response.json(); // { access_token, refresh_token }
}

/**
 * Refresh access token using refresh token.
 * Returns new access_token (same refresh_token).
 */
export async function refreshToken(refreshToken) {
  const response = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    throw new Error('Token refresh failed');
  }

  return response.json(); // { access_token, refresh_token }
}

/**
 * Get current user profile.
 * Requires valid access token.
 */
export async function getCurrentUser(accessToken) {
  const response = await fetch(`${API_BASE}/api/v1/auth/me`, {
    headers: {
      'X-API-Key': API_KEY,
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get user profile');
  }

  return response.json(); // { id, email, display_name, is_verified, created_at }
}
```

---

## Part 3: Auth Context

### File: `src/contexts/AuthContext.jsx`

```jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  refreshToken as refreshTokenApi, 
  getCurrentUser 
} from '../services/authApi';

const AuthContext = createContext(null);

// Token storage keys
const ACCESS_TOKEN_KEY = 'albert_access_token';
const REFRESH_TOKEN_KEY = 'albert_refresh_token';
const USER_KEY = 'albert_user';

/**
 * Parse JWT to get expiration time.
 */
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Check if token is expired or expiring soon (within 1 minute).
 */
function isTokenExpiringSoon(token) {
  const payload = parseJwt(token);
  if (!payload || !payload.exp) return true;
  
  const expiresAt = payload.exp * 1000; // Convert to ms
  const now = Date.now();
  const bufferMs = 60 * 1000; // 1 minute buffer
  
  return now >= expiresAt - bufferMs;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  });
  
  const [accessToken, setAccessToken] = useState(() => 
    localStorage.getItem(ACCESS_TOKEN_KEY)
  );
  
  const [refreshTokenValue, setRefreshTokenValue] = useState(() =>
    localStorage.getItem(REFRESH_TOKEN_KEY)
  );
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  /**
   * Save tokens and fetch user profile.
   * Backend returns only tokens, we need to fetch user separately.
   */
  const saveAuth = useCallback(async (tokenResponse) => {
    const { access_token, refresh_token } = tokenResponse;
    
    // Save tokens immediately
    setAccessToken(access_token);
    setRefreshTokenValue(refresh_token);
    localStorage.setItem(ACCESS_TOKEN_KEY, access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
    
    // Fetch user profile
    try {
      const userData = await getCurrentUser(access_token);
      setUser(userData);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      // Even if profile fetch fails, we have tokens
    }
  }, []);

  /**
   * Clear all auth data.
   */
  const clearAuth = useCallback(() => {
    setAccessToken(null);
    setRefreshTokenValue(null);
    setUser(null);
    
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  /**
   * Refresh the access token.
   */
  const refresh = useCallback(async () => {
    if (!refreshTokenValue || isRefreshing) return null;
    
    setIsRefreshing(true);
    try {
      const response = await refreshTokenApi(refreshTokenValue);
      
      // Update tokens
      setAccessToken(response.access_token);
      setRefreshTokenValue(response.refresh_token);
      localStorage.setItem(ACCESS_TOKEN_KEY, response.access_token);
      localStorage.setItem(REFRESH_TOKEN_KEY, response.refresh_token);
      
      return response.access_token;
    } catch (error) {
      console.error('Token refresh failed:', error);
      clearAuth();
      return null;
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshTokenValue, isRefreshing, clearAuth]);

  /**
   * Get a valid access token, refreshing if needed.
   */
  const getAccessToken = useCallback(async () => {
    if (!accessToken) return null;
    
    if (isTokenExpiringSoon(accessToken)) {
      return await refresh();
    }
    
    return accessToken;
  }, [accessToken, refresh]);

  /**
   * Login with token response from register or login.
   */
  const login = useCallback(async (tokenResponse) => {
    await saveAuth(tokenResponse);
  }, [saveAuth]);

  /**
   * Logout - clear local state only (no backend endpoint).
   */
  const logout = useCallback(() => {
    clearAuth();
  }, [clearAuth]);

  /**
   * Initialize auth state on mount.
   */
  useEffect(() => {
    const initAuth = async () => {
      if (accessToken) {
        // If token is expiring soon, try to refresh
        if (isTokenExpiringSoon(accessToken)) {
          await refresh();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, [accessToken, refresh]);

  const value = {
    user,
    isAuthenticated: !!user && !!accessToken,
    isLoading,
    login,
    logout,
    getAccessToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

---

## Part 4: Updated API Service

### File: `src/services/api.js` (Update existing)

```javascript
/**
 * API service with authentication support.
 * All requests include X-API-Key header.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_KEY = import.meta.env.VITE_API_KEY || '4321';

/**
 * Base fetch with X-API-Key and optional auth token.
 */
async function apiFetch(url, options = {}, getAccessToken = null) {
  const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,  // Always required
    ...options.headers,
  };

  // Add auth token if available
  if (getAccessToken) {
    const token = await getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Request failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Extract transcript from YouTube URL.
 * 
 * Behavior:
 * - If getAccessToken provided (Albert user) → auto-saves to database
 * - If no getAccessToken (PRSMA user) → returns transcript only
 */
export async function extractTranscript(videoUrl, getAccessToken = null) {
  return apiFetch(
    '/api/v1/extract',
    {
      method: 'POST',
      body: JSON.stringify({ video_url: videoUrl }),
    },
    getAccessToken
  );
}

/**
 * List user's saved transcripts.
 * Requires authentication.
 */
export async function listTranscripts(getAccessToken, { limit = 20, offset = 0 } = {}) {
  return apiFetch(
    `/api/v1/transcripts?limit=${limit}&offset=${offset}`,
    { method: 'GET' },
    getAccessToken
  );
}

/**
 * Get specific transcript details.
 * Requires authentication.
 */
export async function getTranscript(transcriptId, getAccessToken) {
  return apiFetch(
    `/api/v1/transcripts/${transcriptId}`,
    { method: 'GET' },
    getAccessToken
  );
}

/**
 * Delete a saved transcript.
 * Requires authentication.
 */
export async function deleteTranscript(transcriptId, getAccessToken) {
  return apiFetch(
    `/api/v1/transcripts/${transcriptId}`,
    { method: 'DELETE' },
    getAccessToken
  );
}

/**
 * Analyze transcript with Claude.
 * Requires authentication and transcript_id from saved transcript.
 */
export async function analyzeTranscript(transcriptId, getAccessToken) {
  return apiFetch(
    '/api/v1/analysis/analyze',
    {
      method: 'POST',
      body: JSON.stringify({ transcript_id: transcriptId }),
    },
    getAccessToken
  );
}

/**
 * Ask Claude a question about analyzed transcript.
 * Requires authentication.
 */
export async function answerQuestion(analysisId, question, getAccessToken) {
  return apiFetch(
    '/api/v1/analysis/answer',
    {
      method: 'POST',
      body: JSON.stringify({ 
        analysis_id: analysisId,
        question: question 
      }),
    },
    getAccessToken
  );
}

/**
 * List user's analyses.
 * Requires authentication.
 */
export async function listAnalyses(getAccessToken, { limit = 20, offset = 0 } = {}) {
  return apiFetch(
    `/api/v1/analysis/?limit=${limit}&offset=${offset}`,
    { method: 'GET' },
    getAccessToken
  );
}

/**
 * Get specific analysis details.
 * Requires authentication.
 */
export async function getAnalysis(analysisId, getAccessToken) {
  return apiFetch(
    `/api/v1/analysis/${analysisId}`,
    { method: 'GET' },
    getAccessToken
  );
}

/**
 * Delete an analysis.
 * Requires authentication.
 */
export async function deleteAnalysis(analysisId, getAccessToken) {
  return apiFetch(
    `/api/v1/analysis/${analysisId}`,
    { method: 'DELETE' },
    getAccessToken
  );
}
```

---

## Part 5: Auth Components

### File: `src/components/auth/AuthLayout.jsx`

```jsx
/**
 * Layout wrapper for authentication pages.
 */
export function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo */}
        <div className="text-center">
          <img 
            src="/albert-logo.svg" 
            alt="Albert" 
            className="mx-auto h-12 w-auto"
          />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-2 text-sm text-gray-600">
              {subtitle}
            </p>
          )}
        </div>

        {/* Content */}
        <div className="bg-white py-8 px-6 shadow rounded-lg">
          {children}
        </div>
      </div>
    </div>
  );
}
```

### File: `src/components/auth/LoginForm.jsx`

```jsx
import { useState } from 'react';

/**
 * Email/password login form.
 */
export function LoginForm({ onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      await onSubmit(formData);
    } catch (err) {
      setError(err.message || 'Login failed');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  );
}
```

### File: `src/components/auth/RegisterForm.jsx`

```jsx
import { useState } from 'react';

/**
 * Email/password registration form.
 */
export function RegisterForm({ onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    try {
      await onSubmit({
        email: formData.email,
        password: formData.password,
        displayName: formData.displayName || null,
      });
    } catch (err) {
      setError(err.message || 'Registration failed');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email address *
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
          Display name (optional)
        </label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          value={formData.displayName}
          onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password *
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500">At least 8 characters</p>
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
          Confirm password *
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          value={formData.confirmPassword}
          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Creating account...' : 'Create account'}
      </button>
    </form>
  );
}
```

---

## Part 6: Pages

### File: `src/pages/LoginPage.jsx`

```jsx
import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { login as loginApi } from '../services/authApi';
import { AuthLayout } from '../components/auth/AuthLayout';
import { LoginForm } from '../components/auth/LoginForm';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Where to redirect after login
  const from = location.state?.from?.pathname || '/';

  const handleLogin = async (credentials) => {
    setIsLoading(true);
    try {
      const tokenResponse = await loginApi(credentials);
      await login(tokenResponse);
      navigate(from, { replace: true });
    } catch (error) {
      throw error; // LoginForm will handle the error display
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Sign in to Albert"
      subtitle="Welcome back! Please enter your details."
    >
      <LoginForm onSubmit={handleLogin} isLoading={isLoading} />
      
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Don't have an account?{' '}
          <Link 
            to="/register" 
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            Sign up
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
```

### File: `src/pages/RegisterPage.jsx`

```jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { register as registerApi } from '../services/authApi';
import { AuthLayout } from '../components/auth/AuthLayout';
import { RegisterForm } from '../components/auth/RegisterForm';

export function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (data) => {
    setIsLoading(true);
    try {
      const tokenResponse = await registerApi(data);
      await login(tokenResponse);
      navigate('/', { replace: true });
    } catch (error) {
      throw error; // RegisterForm will handle the error display
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start analyzing YouTube transcripts with Claude."
    >
      <RegisterForm onSubmit={handleRegister} isLoading={isLoading} />
      
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <Link 
            to="/login" 
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
```

---

## Part 7: Protected Route Component

### File: `src/components/ProtectedRoute.jsx`

```jsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * Protects routes - redirects to login if not authenticated.
 */
export function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login, saving the attempted location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
```

---

## Part 8: User Menu Component

### File: `src/components/UserMenu.jsx`

```jsx
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

/**
 * User dropdown menu in header.
 * Shows user info and logout button.
 */
export function UserMenu() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return (
      <button
        onClick={() => navigate('/login')}
        className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        Sign in
      </button>
    );
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="relative group">
      {/* User button */}
      <button className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-gray-100">
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
          {user?.display_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
        </div>
        <span className="text-sm font-medium text-gray-700">
          {user?.display_name || user?.email}
        </span>
      </button>

      {/* Dropdown menu */}
      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 hidden group-hover:block z-10">
        <div className="px-4 py-2 border-b">
          <p className="text-sm font-medium text-gray-900">
            {user?.display_name || 'User'}
          </p>
          <p className="text-xs text-gray-500">{user?.email}</p>
        </div>
        
        <button
          onClick={() => navigate('/history')}
          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          My Transcripts
        </button>
        
        <button
          onClick={handleLogout}
          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
```

---

## Part 9: Custom Hook

### File: `src/hooks/useAuth.js`

```javascript
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

/**
 * Hook to access auth context.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

---

## Part 10: App Router Setup

### File: `src/App.jsx` (Update)

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { UserMenu } from './components/UserMenu';

// Your existing components
import TranscriptExtractor from './components/TranscriptExtractor';
import TranscriptAnalysis from './components/TranscriptAnalysis';
// ... other imports

function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center space-x-2">
            <img src="/albert-logo.svg" alt="Albert" className="h-8 w-auto" />
            <span className="font-semibold text-xl">Albert</span>
          </a>
          <UserMenu />
        </div>
      </header>
      
      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}

function HomePage() {
  // Your existing home page content
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <TranscriptExtractor />
      {/* TranscriptAnalysis will be shown after extraction */}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <HomePage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <AppLayout>
                  {/* History page component */}
                  <div>History</div>
                </AppLayout>
              </ProtectedRoute>
            }
          />
          
          {/* Add more protected routes as needed */}
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

---

## Part 11: Update TranscriptExtractor

### File: `src/components/TranscriptExtractor.jsx` (Update)

```jsx
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { extractTranscript } from '../services/api';

export function TranscriptExtractor({ onTranscriptExtracted }) {
  const { getAccessToken } = useAuth();
  const [videoUrl, setVideoUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleExtract = async (e) => {
    e.preventDefault();
    
    if (!videoUrl) {
      setError('Please enter a YouTube URL');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Extract with JWT (auto-saves if authenticated)
      const result = await extractTranscript(videoUrl, getAccessToken);
      
      // Pass result to parent
      onTranscriptExtracted?.({
        transcript: result.transcript_text,
        transcriptId: result.transcript_id, // May be null if not saved
        videoTitle: result.video_title,
        videoUrl: result.video_url,
        saved: result.saved, // True if JWT was present
        source: result.source,
      });
      
    } catch (err) {
      setError(err.message || 'Failed to extract transcript');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleExtract} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            YouTube URL
          </label>
          <input
            type="text"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Extracting...' : 'Extract Transcript'}
        </button>
      </form>
    </div>
  );
}
```

---

## Part 12: Update TranscriptAnalysis

### File: `src/components/TranscriptAnalysis.jsx` (Update)

```jsx
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { analyzeTranscript, answerQuestion } from '../services/api';

export function TranscriptAnalysis({ 
  transcriptId,  // UUID from saved transcript (required)
  videoTitle,
  onError 
}) {
  const { getAccessToken } = useAuth();
  const [analysisState, setAnalysisState] = useState({ data: null, error: null });
  const [answerState, setAnswerState] = useState({ question: null, answer: null, error: null });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);

  const handleAnalyze = async () => {
    if (!transcriptId) {
      setAnalysisState({ data: null, error: 'No transcript saved. Please extract a transcript first.' });
      return;
    }

    setIsAnalyzing(true);
    setAnalysisState({ data: null, error: null });

    try {
      const result = await analyzeTranscript(transcriptId, getAccessToken);

      setAnalysisState({
        data: result,
        error: null,
      });
    } catch (err) {
      const errorMessage = err.message || 'Analysis failed';
      setAnalysisState({ data: null, error: errorMessage });
      onError?.(errorMessage, 'analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleQuestionClick = async (question) => {
    if (!analysisState.data?.analysis_id) return;

    setSelectedQuestion(question);
    setIsAnswering(true);
    setAnswerState({ question: null, answer: null, error: null });

    try {
      const result = await answerQuestion(
        analysisState.data.analysis_id,
        question,
        getAccessToken
      );

      setAnswerState({
        question: result.question,
        answer: result.answer,
        error: null,
      });
    } catch (err) {
      setAnswerState({
        question,
        answer: null,
        error: err.message || 'Failed to answer question',
      });
    } finally {
      setIsAnswering(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Analyze button */}
      {!analysisState.data && (
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing || !transcriptId}
          className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAnalyzing ? 'Analyzing with Claude...' : 'Analyze with Claude'}
        </button>
      )}

      {/* Analysis error */}
      {analysisState.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {analysisState.error}
        </div>
      )}

      {/* Analysis results */}
      {analysisState.data && (
        <div className="space-y-6">
          {/* Categories */}
          {analysisState.data.categories?.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Categories</h3>
              <div className="flex flex-wrap gap-2">
                {analysisState.data.categories.map((category, i) => (
                  <span key={i} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    {category}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Key Data */}
          {analysisState.data.extracted_data && Object.keys(analysisState.data.extracted_data).length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Key Information</h3>
              <dl className="space-y-2">
                {Object.entries(analysisState.data.extracted_data).map(([key, value]) => (
                  <div key={key} className="flex">
                    <dt className="font-medium text-gray-700 w-1/3">{key}:</dt>
                    <dd className="text-gray-900 w-2/3">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* Suggested Questions */}
          {analysisState.data.suggested_questions?.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Suggested Questions</h3>
              <div className="space-y-2">
                {analysisState.data.suggested_questions.map((question, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuestionClick(question)}
                    disabled={isAnswering}
                    className="w-full text-left px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-md text-sm disabled:opacity-50"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Answer Display */}
          {answerState.answer && (
            <div className="bg-green-50 border border-green-200 p-4 rounded-md">
              <h4 className="font-semibold text-green-900 mb-2">
                Q: {answerState.question}
              </h4>
              <p className="text-green-800">{answerState.answer}</p>
            </div>
          )}

          {answerState.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {answerState.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## Part 13: Update HomePage Integration

### File: Update your `HomePage` component

```jsx
import { useState } from 'react';
import { TranscriptExtractor } from '../components/TranscriptExtractor';
import { TranscriptAnalysis } from '../components/TranscriptAnalysis';

function HomePage() {
  const [transcriptData, setTranscriptData] = useState(null);

  const handleTranscriptExtracted = (data) => {
    setTranscriptData(data);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-4">Extract YouTube Transcript</h1>
        <TranscriptExtractor onTranscriptExtracted={handleTranscriptExtracted} />
      </div>

      {transcriptData && (
        <>
          {/* Save indicator */}
          {transcriptData.saved && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              ✓ Transcript saved to your account
            </div>
          )}

          {/* Transcript display */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-bold mb-2">{transcriptData.videoTitle}</h2>
            <p className="text-sm text-gray-500 mb-4">Source: {transcriptData.source}</p>
            <div className="max-h-96 overflow-y-auto bg-gray-50 p-4 rounded">
              <pre className="whitespace-pre-wrap text-sm">{transcriptData.transcript}</pre>
            </div>
          </div>

          {/* Analysis (only if transcript was saved) */}
          {transcriptData.saved && transcriptData.transcriptId && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">AI Analysis</h2>
              <TranscriptAnalysis
                transcriptId={transcriptData.transcriptId}
                videoTitle={transcriptData.videoTitle}
              />
            </div>
          )}

          {/* Warning if not saved */}
          {!transcriptData.saved && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
              ℹ️ Analysis requires a saved transcript. Please sign in to save and analyze transcripts.
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

---

## Implementation Checklist

### Phase 1: Setup
- [ ] Add environment variables (`.env`)
- [ ] Install dependencies (`react-router-dom`)
- [ ] Create folder structure

### Phase 2: Auth Foundation
- [ ] Create `src/services/authApi.js`
- [ ] Create `src/contexts/AuthContext.jsx`
- [ ] Create `src/hooks/useAuth.js`

### Phase 3: Auth UI
- [ ] Create `src/components/auth/AuthLayout.jsx`
- [ ] Create `src/components/auth/LoginForm.jsx`
- [ ] Create `src/components/auth/RegisterForm.jsx`
- [ ] Create `src/pages/LoginPage.jsx`
- [ ] Create `src/pages/RegisterPage.jsx`

### Phase 4: App Integration
- [ ] Create `src/components/ProtectedRoute.jsx`
- [ ] Create `src/components/UserMenu.jsx`
- [ ] Update `src/App.jsx` with routes
- [ ] Update `src/services/api.js` with X-API-Key

### Phase 5: Component Updates
- [ ] Update `src/components/TranscriptExtractor.jsx`
- [ ] Update `src/components/TranscriptAnalysis.jsx`
- [ ] Update HomePage integration

### Phase 6: Testing
- [ ] Test registration flow
- [ ] Test login flow
- [ ] Test token refresh (wait 15 min)
- [ ] Test protected route redirect
- [ ] Test transcript extraction (with JWT)
- [ ] Test transcript extraction (without JWT - should work from login page first)
- [ ] Test analysis flow
- [ ] Test logout

---

## Key Differences from V2

### ✅ Fixed Issues:
1. **X-API-Key header** now included on ALL requests
2. **Google OAuth removed** (not yet implemented in backend)
3. **Logout endpoint removed** (just clears localStorage)
4. **User profile** fetched separately after login
5. **Extract API** simplified (JWT presence = auto-save)
6. **API key** configured via environment variable

### ✅ Matches Backend:
- All endpoint paths correct
- Request/response formats match
- Authentication flow matches Phase 3
- Extract behavior matches Phase 4
- Analysis flow matches Phase 6

---

## Future: Adding Google OAuth (Later)

When Google OAuth is implemented in backend (deferred phase), you'll need to:

1. Add Google OAuth functions back to `authApi.js`:
   - `getGoogleAuthUrl()`
   - `googleCallback()`

2. Create `src/pages/AuthCallbackPage.jsx`

3. Add Google button to login/register pages

4. Add `/auth/google/callback` route

Until then, **email/password authentication only**.

---

## Summary

This frontend integration:
- ✅ Works with the backend implementation guide
- ✅ Includes required X-API-Key header
- ✅ Uses JWT-based auto-save
- ✅ Email/password auth only (Google deferred)
- ✅ Simplified logout (no backend call)
- ✅ Matches all backend API contracts
- ✅ Ready to implement after backend Phase 3

**You can now implement this frontend alongside your backend development!**
