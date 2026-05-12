'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { useI18n } from '@/hooks/use-i18n';
import { PLANS, PLAN_ORDER } from '@/lib/plans';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import {
  Brain,
  BarChart3,
  MessageSquare,
  Database,
  ArrowRight,
  Upload,
  MessageCircle,
  Sparkles,
  Check,
  Globe,
  ChevronUp,
  Loader2,
} from 'lucide-react';

// ─── Navbar ──────────────────────────────────────────────────────────
function Navbar({
  scrolled,
  locale,
  setLocale,
  openAuthModal,
  t,
}: {
  scrolled: boolean;
  locale: string;
  setLocale: (l: 'en' | 'es') => void;
  openAuthModal: (tab: 'signin' | 'signup') => void;
  t: (key: string) => string;
}) {
  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-gray-950/90 backdrop-blur-md border-b border-gray-800 shadow-lg'
          : 'bg-gray-950 border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
            <Brain className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">
            DataMind BI
          </span>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language Switcher */}
          <button
            onClick={() => setLocale(locale === 'en' ? 'es' : 'en')}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
            aria-label="Switch language"
          >
            <Globe className="h-4 w-4" />
            <span>{locale === 'en' ? 'EN' : 'ES'}</span>
          </button>

          <Button
            variant="ghost"
            className="text-gray-300 hover:text-white hover:bg-gray-800 hidden sm:inline-flex"
            onClick={() => openAuthModal('signin')}
          >
            {t('landingSignIn')}
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
            onClick={() => openAuthModal('signup')}
          >
            {t('landingGetStarted')}
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      </div>
    </nav>
  );
}

// ─── Hero Section ────────────────────────────────────────────────────
function HeroSection({
  locale,
  openAuthModal,
  t,
}: {
  locale: string;
  openAuthModal: (tab: 'signin' | 'signup') => void;
  t: (key: string) => string;
}) {
  const [videoReady, setVideoReady] = React.useState(false);

  return (
    <section className="relative bg-gray-950 h-svh overflow-hidden flex items-center">
      {/* Layer 0: Video (bottom layer) */}
      <video
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        onCanPlay={() => setVideoReady(true)}
      >
        <source src="/hero/datamind-hero-movie.mp4" type="video/mp4" />
      </video>

      {/* Layer 1: Poster image overlay — shows while video loads, fades when ready */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 ${
          videoReady ? 'opacity-0' : 'opacity-100'
        }`}
        style={{ zIndex: 1 }}
      >
        <img
          src="/hero/datamind-hero.png"
          alt=""
          className="w-full h-full object-cover"
        />
      </div>

      {/* Layer 2: Dark overlay for text readability */}
      <div className="absolute inset-0 bg-gray-950/60" style={{ zIndex: 2 }} />

      {/* Layer 3: Gradient fade at bottom */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/20 to-gray-950/40"
        style={{ zIndex: 3 }}
      />

      {/* Spinner — small, bottom-right, only while loading */}
      {!videoReady && (
        <div className="absolute bottom-4 right-4" style={{ zIndex: 4 }}>
          <Loader2 className="h-4 w-4 animate-spin text-emerald-400/60" />
        </div>
      )}

      {/* Layer 5: Content — text, buttons, etc. */}
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center" style={{ zIndex: 5 }}>
        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 mb-8">
          <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-sm font-medium text-emerald-300">
            {locale === 'es' ? 'IA Potenciada para tu Negocio' : 'AI-Powered for Your Business'}
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight mb-6">
          {t('heroHeadline').split(',').map((part, i, arr) => (
            <React.Fragment key={i}>
              {i === arr.length - 1 ? (
                <span className="text-emerald-400">{part}</span>
              ) : (
                part + ','
              )}
            </React.Fragment>
          ))}
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          {t('heroSubtitle')}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
          <Button
            size="lg"
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-base h-12 px-8 shadow-lg shadow-emerald-600/20"
            onClick={() => openAuthModal('signup')}
          >
            {t('heroCtaPrimary')}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800 hover:border-gray-600 h-12 px-8 text-base"
            onClick={() => {
              const el = document.getElementById('how-it-works');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            {t('heroCtaSecondary')}
          </Button>
        </div>

        {/* Stats Row */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-400" />
            <span>{t('heroStat1')}</span>
          </div>
          <div className="hidden sm:block h-4 w-px bg-gray-700" />
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-400" />
            <span>{t('heroStat2')}</span>
          </div>
          <div className="hidden sm:block h-4 w-px bg-gray-700" />
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-400" />
            <span>{t('heroStat3')}</span>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce" style={{ zIndex: 5 }}>
        <button
          onClick={() => {
            const el = document.getElementById('features');
            el?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="flex flex-col items-center gap-1 text-gray-400 hover:text-emerald-400 transition-colors"
          aria-label="Scroll down"
        >
          <ChevronUp className="h-5 w-5 rotate-180" />
        </button>
      </div>
    </section>
  );
}

// ─── Features Section ────────────────────────────────────────────────
function FeaturesSection({ t }: { t: (key: string) => string }) {
  const features = [
    {
      icon: <Database className="h-6 w-6" />,
      title: t('feature1Title'),
      description: t('feature1Desc'),
      bullets: [t('feature1Bullet1'), t('feature1Bullet2'), t('feature1Bullet3')],
    },
    {
      icon: <MessageSquare className="h-6 w-6" />,
      title: t('feature2Title'),
      description: t('feature2Desc'),
      bullets: [t('feature2Bullet1'), t('feature2Bullet2'), t('feature2Bullet3')],
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: t('feature3Title'),
      description: t('feature3Desc'),
      bullets: [t('feature3Bullet1'), t('feature3Bullet2'), t('feature3Bullet3')],
    },
  ];

  return (
    <section id="features" className="py-20 sm:py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            {t('featuresTitle')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('featuresSubtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-xl border border-border/50 bg-card p-6 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300"
            >
              {/* Icon */}
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-600 mb-5 group-hover:bg-emerald-600/20 transition-colors">
                {feature.icon}
              </div>

              {/* Title & Description */}
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground mb-4">{feature.description}</p>

              {/* Bullets */}
              <ul className="space-y-2">
                {feature.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How It Works Section ────────────────────────────────────────────
function HowItWorksSection({ t }: { t: (key: string) => string }) {
  const steps = [
    {
      number: '01',
      icon: <Upload className="h-6 w-6" />,
      title: t('step1Title'),
      description: t('step1Desc'),
    },
    {
      number: '02',
      icon: <MessageCircle className="h-6 w-6" />,
      title: t('step2Title'),
      description: t('step2Desc'),
    },
    {
      number: '03',
      icon: <Sparkles className="h-6 w-6" />,
      title: t('step3Title'),
      description: t('step3Desc'),
    },
  ];

  return (
    <section id="how-it-works" className="py-20 sm:py-24 bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
            {t('howItWorksTitle')}
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            {t('howItWorksSubtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 relative">
          {/* Connector line (desktop only) */}
          <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-px bg-gradient-to-r from-gray-800 via-emerald-600/40 to-gray-800" />

          {steps.map((step, index) => (
            <div key={step.number} className="relative text-center">
              {/* Step circle */}
              <div className="relative z-10 mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gray-900 border-2 border-emerald-600/40 text-emerald-400 shadow-lg shadow-emerald-600/10">
                {step.icon}
                <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold">
                  {step.number}
                </span>
              </div>

              <h3 className="text-xl font-semibold text-white mb-3">
                {step.title}
              </h3>
              <p className="text-gray-400 leading-relaxed max-w-sm mx-auto">
                {step.description}
              </p>

              {/* Arrow to next step (mobile only) */}
              {index < steps.length - 1 && (
                <div className="md:hidden flex justify-center my-4">
                  <ArrowRight className="h-5 w-5 text-emerald-600 rotate-90" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Pricing Section ─────────────────────────────────────────────────
function PricingSection({
  locale,
  openAuthModal,
  t,
}: {
  locale: string;
  openAuthModal: (tab: 'signin' | 'signup') => void;
  t: (key: string) => string;
}) {
  const getPlanFeatures = (planId: string) => {
    const plan = PLANS[planId as keyof typeof PLANS];
    const features: string[] = [];

    if (plan.maxQueries === null) {
      features.push(`${t('unlimited')} ${t('pricingFeatureQueries')}`);
    } else {
      features.push(`${plan.maxQueries} ${t('pricingFeatureQueries')}`);
    }

    if (plan.maxDataSources === null) {
      features.push(`${t('unlimited')} ${t('pricingFeatureDataSources')}`);
    } else {
      features.push(`${plan.maxDataSources} ${t('pricingFeatureDataSources')}`);
    }

    if (plan.maxStorageMB === null) {
      features.push(`${t('unlimited')} ${t('pricingFeatureStorage')}`);
    } else {
      features.push(`${plan.maxStorageMB} MB ${t('pricingFeatureStorage')}`);
    }

    if (plan.maxDashboards === null) {
      features.push(`${t('unlimited')} ${t('pricingFeatureDashboards')}`);
    } else {
      features.push(`${plan.maxDashboards} ${t('pricingFeatureDashboards')}`);
    }

    if (plan.maxExportRows === null) {
      features.push(`${t('unlimited')} ${t('pricingFeatureExport')}`);
    } else {
      features.push(`${plan.maxExportRows} ${t('pricingFeatureExport')}`);
    }

    if (plan.canAnalyze) features.push(t('pricingFeatureAiAnalysis'));
    if (plan.canShare) features.push(t('pricingFeatureShare'));
    if (plan.canUseCustomKeys) features.push(t('pricingFeatureCustomKeys'));
    if (plan.prioritySupport) features.push(t('pricingFeaturePriority'));

    return features;
  };

  const isPopular = (planId: string) => planId === 'starter';

  return (
    <section id="pricing" className="py-20 sm:py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            {t('pricingTitle')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('pricingSubtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-3">
          {PLAN_ORDER.map((planId) => {
            const plan = PLANS[planId];
            const popular = isPopular(planId);
            const features = getPlanFeatures(planId);
            const planName = locale === 'es' ? plan.nameEs : plan.name;

            return (
              <div
                key={planId}
                className={`relative rounded-xl border p-6 flex flex-col transition-all duration-200 ${
                  popular
                    ? 'border-emerald-500 bg-card shadow-lg shadow-emerald-500/10 scale-[1.02] z-10'
                    : 'border-border/50 bg-card hover:border-emerald-500/30 hover:shadow-md'
                }`}
              >
                {/* Popular badge */}
                {popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-emerald-600 text-white border-0 px-3 py-0.5 text-xs font-semibold">
                      {t('pricingPopular')}
                    </Badge>
                  </div>
                )}

                {/* Plan Name */}
                <h3 className="text-lg font-semibold mb-1">{planName}</h3>

                {/* Price */}
                <div className="mb-4">
                  <span className="text-3xl font-bold">{plan.priceDisplay}</span>
                  <span className="text-muted-foreground text-sm">{t('pricingPerMonth')}</span>
                </div>

                {/* Divider */}
                <div className="h-px bg-border/50 mb-4" />

                {/* Features */}
                <ul className="space-y-2.5 mb-6 flex-1">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Button
                  className={`w-full font-medium ${
                    popular
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
                      : planId === 'free'
                        ? 'bg-gray-100 hover:bg-gray-200 text-gray-900 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-100'
                        : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                  }`}
                  onClick={() => openAuthModal('signup')}
                >
                  {t('pricingCta')}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── FAQ Section ─────────────────────────────────────────────────────
function FAQSection({ t }: { t: (key: string) => string }) {
  const faqs = [
    { q: t('faqQ1'), a: t('faqA1') },
    { q: t('faqQ2'), a: t('faqA2') },
    { q: t('faqQ3'), a: t('faqA3') },
    { q: t('faqQ4'), a: t('faqA4') },
    { q: t('faqQ5'), a: t('faqA5') },
    { q: t('faqQ6'), a: t('faqA6') },
  ];

  return (
    <section className="py-20 sm:py-24 bg-gray-950">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
            {t('faqTitle')}
          </h2>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 sm:p-6">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`faq-${index}`}
                className="border-gray-800"
              >
                <AccordionTrigger className="text-left text-white hover:text-emerald-400 hover:no-underline text-base">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-gray-400 leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}

// ─── Final CTA Section ───────────────────────────────────────────────
function FinalCTASection({
  openAuthModal,
  t,
}: {
  openAuthModal: (tab: 'signin' | 'signup') => void;
  t: (key: string) => string;
}) {
  return (
    <section className="py-20 sm:py-24 bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
          {t('finalCtaTitle')}
        </h2>
        <p className="text-lg text-muted-foreground mb-8">
          {t('finalCtaSubtitle')}
        </p>
        <Button
          size="lg"
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-base h-12 px-8 shadow-lg shadow-emerald-600/20"
          onClick={() => openAuthModal('signup')}
        >
          {t('finalCtaButton')}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────
function Footer({
  locale,
  setLocale,
  t,
}: {
  locale: string;
  setLocale: (l: 'en' | 'es') => void;
  t: (key: string) => string;
}) {
  return (
    <footer className="bg-gray-950 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
                <Brain className="h-4 w-4" />
              </div>
              <span className="text-base font-bold text-white">DataMind BI</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              {t('footerTagline')}
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">{t('footerProduct')}</h4>
            <ul className="space-y-2">
              <li>
                <a href="#features" className="text-sm text-gray-400 hover:text-emerald-400 transition-colors">
                  {t('footerFeatures')}
                </a>
              </li>
              <li>
                <a href="#pricing" className="text-sm text-gray-400 hover:text-emerald-400 transition-colors">
                  {t('footerPricing')}
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-400 hover:text-emerald-400 transition-colors">
                  {t('footerDocumentation')}
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">{t('footerCompany')}</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-sm text-gray-400 hover:text-emerald-400 transition-colors">
                  {t('footerAbout')}
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-400 hover:text-emerald-400 transition-colors">
                  {t('footerBlog')}
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-400 hover:text-emerald-400 transition-colors">
                  {t('footerCareers')}
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">{t('footerLegal')}</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-sm text-gray-400 hover:text-emerald-400 transition-colors">
                  {t('footerPrivacy')}
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-400 hover:text-emerald-400 transition-colors">
                  {t('footerTerms')}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} DataMind BI. {t('footerCopyright')}
          </p>
          <button
            onClick={() => setLocale(locale === 'en' ? 'es' : 'en')}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            <Globe className="h-3.5 w-3.5" />
            {locale === 'en' ? 'English' : 'Español'}
          </button>
        </div>
      </div>
    </footer>
  );
}

// ─── Scroll to Top ───────────────────────────────────────────────────
function ScrollToTopButton({ visible, onClick }: { visible: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`fixed bottom-6 right-6 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 transition-all duration-300 hover:bg-emerald-500 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
      aria-label="Scroll to top"
    >
      <ChevronUp className="h-5 w-5" />
    </button>
  );
}

// ─── Main Component ──────────────────────────────────────────────────
export function WelcomeScreen() {
  const { openAuthModal } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const [scrolled, setScrolled] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
      setShowScrollTop(window.scrollY > 600);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        scrolled={scrolled}
        locale={locale}
        setLocale={setLocale}
        openAuthModal={openAuthModal}
        t={t}
      />
      <main className="flex-1">
        <HeroSection locale={locale} openAuthModal={openAuthModal} t={t} />
        <FeaturesSection t={t} />
        <HowItWorksSection t={t} />
        <PricingSection locale={locale} openAuthModal={openAuthModal} t={t} />
        <FAQSection t={t} />
        <FinalCTASection openAuthModal={openAuthModal} t={t} />
      </main>
      <Footer locale={locale} setLocale={setLocale} t={t} />
      <ScrollToTopButton visible={showScrollTop} onClick={scrollToTop} />
    </div>
  );
}
