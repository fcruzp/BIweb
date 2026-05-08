'use client';

import { Brain, Database, MessageSquare, BarChart3, Upload, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAppStore } from '@/stores/app-store';

const features = [
  {
    icon: <Database className="h-5 w-5" />,
    title: 'Upload Data',
    description: 'Upload SQLite databases and let AI analyze the schema automatically',
  },
  {
    icon: <MessageSquare className="h-5 w-5" />,
    title: 'Ask Questions',
    description: 'Chat in natural language and get SQL queries generated automatically',
  },
  {
    icon: <BarChart3 className="h-5 w-5" />,
    title: 'Visualize Results',
    description: 'AI-powered chart recommendations and interactive visualizations',
  },
];

export function WelcomeScreen() {
  const { dataSources } = useAppStore();
  const hasDataSources = dataSources.length > 0;

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 max-w-2xl mx-auto">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-white mb-6">
        <Brain className="h-8 w-8" />
      </div>

      <h1 className="text-2xl font-bold text-center mb-2">
        Welcome to DataMind
      </h1>
      <p className="text-muted-foreground text-center mb-8 max-w-md">
        Your AI-powered Business Intelligence assistant. Upload a database, ask questions in natural language, and get instant insights with visualizations.
      </p>

      <div className="grid gap-4 w-full mb-8">
        {features.map((feature, i) => (
          <Card key={i} className="bg-card/50 border-border/50">
            <CardContent className="flex items-start gap-4 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-500">
                {feature.icon}
              </div>
              <div>
                <h3 className="text-sm font-semibold">{feature.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {feature.description}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {hasDataSources ? (
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Select a data source from the sidebar to start querying
          </p>
          <ArrowRight className="h-5 w-5 text-emerald-500 mx-auto animate-pulse" />
        </div>
      ) : (
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 gap-2"
          onClick={() => {
            // The upload dialog is triggered from sidebar, show a hint
            const sidebarTrigger = document.querySelector('[data-sidebar="trigger"]');
            if (sidebarTrigger instanceof HTMLElement) {
              sidebarTrigger.click();
            }
          }}
        >
          <Upload className="h-4 w-4" />
          Upload Your First Database
        </Button>
      )}
    </div>
  );
}
