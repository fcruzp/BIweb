'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuth, type AuthTab } from './AuthProvider';
import { createClient } from '@/utils/supabase/client';
import {
  Mail,
  Lock,
  User,
  Loader2,
  Eye,
  EyeOff,
  ArrowLeft,
  Chrome,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, authModalTab } = useAuth();
  const [activeTab, setActiveTab] = useState<AuthTab>(authModalTab);
  const [prevAuthModalTab, setPrevAuthModalTab] = useState<AuthTab>(authModalTab);

  // Sync tab when authModalTab changes from outside
  if (authModalTab !== prevAuthModalTab) {
    setPrevAuthModalTab(authModalTab);
    setActiveTab(authModalTab);
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value as AuthTab);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeAuthModal();
    }
  };

  return (
    <Dialog open={isAuthModalOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[440px] bg-gray-950 border-gray-800 p-0 overflow-hidden">
        <div className="relative">
          {/* Decorative gradient accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />

          <div className="p-6 pt-8">
            <DialogHeader className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg text-white">
                    {activeTab === 'forgot-password' ? 'Reset Password' : 'Welcome to DataMind'}
                  </DialogTitle>
                  <DialogDescription className="text-gray-400 text-sm">
                    {activeTab === 'forgot-password'
                      ? 'Enter your email to receive a reset link'
                      : 'Sign in to your account or create a new one'}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {activeTab === 'forgot-password' ? (
              <ForgotPasswordForm onBackToSignIn={() => setActiveTab('signin')} />
            ) : (
              <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-gray-900 mb-6">
                  <TabsTrigger
                    value="signin"
                    className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-gray-400"
                  >
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger
                    value="signup"
                    className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-gray-400"
                  >
                    Sign Up
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="signin">
                  <SignInForm onForgotPassword={() => setActiveTab('forgot-password')} />
                </TabsContent>

                <TabsContent value="signup">
                  <SignUpForm />
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sign In Form ───────────────────────────────────────────

function SignInForm({ onForgotPassword }: { onForgotPassword: () => void }) {
  const { closeAuthModal } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      closeAuthModal();
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) {
        setError(authError.message);
        setIsLoading(false);
      }
    } catch {
      setError('Failed to connect to Google. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Google OAuth */}
      <Button
        type="button"
        variant="outline"
        className="w-full bg-gray-900 border-gray-700 text-gray-200 hover:bg-gray-800 hover:text-white"
        onClick={handleGoogleSignIn}
        disabled={isLoading}
      >
        <Chrome className="h-4 w-4 mr-2" />
        Continue with Google
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator className="w-full bg-gray-800" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-gray-950 px-2 text-gray-500">or sign in with email</span>
        </div>
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="signin-email" className="text-gray-300 text-sm">
          Email
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            id="signin-email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="pl-10 bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/30"
          />
        </div>
      </div>

      {/* Password */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="signin-password" className="text-gray-300 text-sm">
            Password
          </Label>
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-xs text-emerald-500 hover:text-emerald-400 transition-colors"
          >
            Forgot password?
          </button>
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            id="signin-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="pl-10 pr-10 bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/30"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : (
          'Sign In'
        )}
      </Button>

      <p className="text-center text-xs text-gray-500 mt-4">
        By signing in, you agree to our Terms of Service and Privacy Policy.
      </p>
    </form>
  );
}

// ─── Sign Up Form ───────────────────────────────────────────

function SignUpForm() {
  const { closeAuthModal } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      console.log('[SignUp] Creating account for:', email);
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) {
        console.error('[SignUp] Auth error:', authError.message);
        setError(authError.message);
        return;
      }

      // Log what Supabase returned — critical for debugging
      console.log('[SignUp] Result:', {
        hasUser: !!data.user,
        hasSession: !!data.session,
        userId: data.user?.id,
        email: data.user?.email,
        emailConfirmed: data.user?.email_confirmed_at,
        confirmedAt: data.user?.confirmed_at,
      });

      // Check if the user was immediately signed in (email confirmation disabled)
      // In this case, data.session exists — the user is auto-confirmed
      if (data.session && data.user) {
        // User is auto-confirmed and signed in — close modal and proceed
        // The onAuthStateChange listener will handle syncing the user to our DB
        console.log('[SignUp] Auto-confirmed user signed in — closing modal');
        closeAuthModal();
        return;
      }

      // Email confirmation required — show message to check email
      // data.user exists but data.session is null (user not yet confirmed)
      console.log('[SignUp] Email confirmation required — showing check-email message');
      setSuccessMessage(
        'Account created! Check your email for a confirmation link before signing in.'
      );
    } catch (err) {
      console.error('[SignUp] Unexpected error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) {
        setError(authError.message);
        setIsLoading(false);
      }
    } catch {
      setError('Failed to connect to Google. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Google OAuth */}
      <Button
        type="button"
        variant="outline"
        className="w-full bg-gray-900 border-gray-700 text-gray-200 hover:bg-gray-800 hover:text-white"
        onClick={handleGoogleSignUp}
        disabled={isLoading}
      >
        <Chrome className="h-4 w-4 mr-2" />
        Continue with Google
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator className="w-full bg-gray-800" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-gray-950 px-2 text-gray-500">or sign up with email</span>
        </div>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="signup-name" className="text-gray-300 text-sm">
          Full Name
        </Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            id="signup-name"
            type="text"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="pl-10 bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/30"
          />
        </div>
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="signup-email" className="text-gray-300 text-sm">
          Email
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            id="signup-email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="pl-10 bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/30"
          />
        </div>
      </div>

      {/* Password */}
      <div className="space-y-2">
        <Label htmlFor="signup-password" className="text-gray-300 text-sm">
          Password
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            id="signup-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="pl-10 pr-10 bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/30"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Creating account...
          </>
        ) : (
          'Create Account'
        )}
      </Button>

      <p className="text-center text-xs text-gray-500 mt-4">
        By signing up, you agree to our Terms of Service and Privacy Policy.
      </p>
    </form>
  );
}

// ─── Forgot Password Form ───────────────────────────────────

function ForgotPasswordForm({ onBackToSignIn }: { onBackToSignIn: () => void }) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      setSuccessMessage(
        'Password reset link sent! Check your email inbox and follow the instructions.'
      );
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="forgot-email" className="text-gray-300 text-sm">
            Email Address
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              id="forgot-email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="pl-10 bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/30"
            />
          </div>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending reset link...
            </>
          ) : (
            'Send Reset Link'
          )}
        </Button>
      </form>

      {/* Back to sign in */}
      <button
        type="button"
        onClick={onBackToSignIn}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-emerald-400 transition-colors mx-auto"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Sign In
      </button>
    </div>
  );
}
