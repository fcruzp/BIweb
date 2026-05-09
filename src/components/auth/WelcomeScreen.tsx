'use client';

import React from 'react';
import { useAuth } from './AuthProvider';
import { Button } from '@/components/ui/button';
import {
  Brain,
  BarChart3,
  MessageSquare,
  Database,
  Shield,
  Zap,
  ArrowRight,
  Chrome,
} from 'lucide-react';

export function WelcomeScreen() {
  const { openAuthModal } = useAuth();

  const features = [
    {
      icon: <Database className="h-5 w-5" />,
      title: 'Upload Your Data',
      description: 'Import SQLite databases and get instant AI-powered schema analysis.',
    },
    {
      icon: <MessageSquare className="h-5 w-5" />,
      title: 'Ask in Natural Language',
      description: 'Query your data using plain language — no SQL knowledge required.',
    },
    {
      icon: <BarChart3 className="h-5 w-5" />,
      title: 'Smart Visualizations',
      description: 'Auto-generated charts and dashboards for your query results.',
    },
    {
      icon: <Shield className="h-5 w-5" />,
      title: 'Secure & Private',
      description: 'Your data stays yours. Multi-tenant isolation keeps everything separate.',
    },
    {
      icon: <Zap className="h-5 w-5" />,
      title: 'AI-Powered Insights',
      description: 'Executive-level analysis with key findings and recommendations.',
    },
    {
      icon: <Brain className="h-5 w-5" />,
      title: 'Context-Aware',
      description: 'AI understands your business context, glossary, and relationships.',
    },
  ];

  return (
    <div className="min-h-svh flex flex-col bg-background">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
            <Brain className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">DataMind</h1>
            <p className="text-xs text-muted-foreground">AI-Powered Business Intelligence</p>
          </div>
        </div>

        {/* Heading */}
        <div className="text-center max-w-lg mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Turn Your Data Into{' '}
            <span className="text-emerald-500">Intelligence</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Upload your database, ask questions in natural language, and get instant AI-powered insights with beautiful visualizations.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mb-16 w-full max-w-sm">
          <Button
            size="lg"
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-base h-12"
            onClick={() => openAuthModal('signup')}
          >
            Get Started Free
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="flex-1 h-12 text-base"
            onClick={() => openAuthModal('signin')}
          >
            Sign In
          </Button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-8 w-full max-w-sm">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Google Sign In */}
        <Button
          size="lg"
          variant="outline"
          className="w-full max-w-sm h-12 text-base mb-16"
          onClick={() => {
            // This will be handled by the Supabase client
            import('@/utils/supabase/client').then(({ createClient }) => {
              const supabase = createClient();
              supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                  redirectTo: `${window.location.origin}/auth/callback`,
                },
              });
            });
          }}
        >
          <Chrome className="mr-2 h-5 w-5" />
          Continue with Google
        </Button>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl w-full">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-lg border border-border/50 bg-card p-4 hover:border-emerald-500/30 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="text-emerald-500">{feature.icon}</div>
                <h3 className="font-semibold text-sm">{feature.title}</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/50 py-4 px-4 text-center">
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} DataMind BI. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
