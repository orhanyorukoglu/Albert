import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import AuthLayout from '../components/auth/AuthLayout'
import LoginForm from '../components/auth/LoginForm'
import ApiEnvironmentSwitcher from '../components/ApiEnvironmentSwitcher'

const TESTING_MODE = import.meta.env.VITE_TESTING_MODE === 'yes'

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth()

  // If already authenticated, redirect to home
  if (isAuthenticated && !isLoading) {
    return <Navigate to="/" replace />
  }

  // Show nothing while checking auth status
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <AuthLayout
      title="Welcome back"
      description="Sign in to your account to continue"
      footer={
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-600 hover:underline font-medium">
              Sign up
            </Link>
          </p>
          {TESTING_MODE && <ApiEnvironmentSwitcher />}
        </div>
      }
    >
      <LoginForm />
    </AuthLayout>
  )
}
