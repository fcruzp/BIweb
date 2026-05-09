/**
 * useAuth - Re-exported from AuthProvider for convenience
 *
 * This hook is the primary way to access auth state in client components.
 * It uses React Context from AuthProvider which wraps the entire app.
 *
 * Usage:
 *   import { useAuth } from '@/hooks/useAuth'
 *   const { user, isAuthenticated, isLoading, openAuthModal, signOut } = useAuth()
 */

export { useAuth, type AuthTab } from '@/components/auth/AuthProvider'
