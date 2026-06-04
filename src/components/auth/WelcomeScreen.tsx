'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { useI18n } from '@/hooks/use-i18n';
import { PLANS, PLAN_ORDER, type PlanId } from '@/lib/plans';
import { setPendingUpgradePlan } from '@/lib/pending-plan';
import { type TranslationFn } from '@/lib/i18n';
import { motion } from 'framer-motion';
import { ProgressIndicator } from '@/components/landing/ProgressIndicator';
import { BackgroundTimeline } from '@/components/landing/BackgroundTimeline';
import { Card3D } from '@/components/landing/Card3D';
import { FeaturesBento } from '@/components/landing/FeaturesBento';
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
    ChevronDown,
    Menu,
    X,
    Play,
} from 'lucide-react';

// ─── Navbar (Floating Center Pill) ──────────────────────────────────
function Navbar({
    locale,
    setLocale,
    openAuthModal,
    t,
}: {
    locale: string;
    setLocale: (l: 'en' | 'es') => void;
    openAuthModal: (tab: 'signin' | 'signup') => void;
    t: TranslationFn;
}) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        setMobileMenuOpen(false);
    };

    return (
        <nav className="fixed top-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] md:w-full max-w-[min(1040px,92vw)] z-50 transition-all duration-300">
            <div className="w-full bg-gradient-to-r from-[#0a0e17] to-[#060910] border border-[rgba(100,210,255,0.1)] rounded-full px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-[0_10px_35px_rgba(3,7,18,0.7)] backdrop-blur-md">
                {/* Brand */}
                <button
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="flex items-center gap-2 cursor-pointer group"
                >
                    <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 group-hover:border-cyan-400 group-hover:bg-cyan-500/20 transition-all">
                        <Brain className="w-4 h-4 text-[#64d2ff] group-hover:scale-110 transition-transform" />
                    </div>
                    <span className="font-[family-name:var(--font-display)] text-sm sm:text-lg tracking-[0.15em] font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-[#64d2ff]">
                        DATAMIND BI
                    </span>
                </button>

                {/* Nav links - Desktop */}
                <div className="hidden md:flex items-center gap-6 lg:gap-8">
                    <button
                        onClick={() => scrollToSection('features')}
                        className="font-[family-name:var(--font-display)] text-[10px] tracking-[0.22em] text-white/70 hover:text-cyan-400 uppercase transition-all cursor-pointer font-semibold"
                    >
                        Features
                    </button>
                    <button
                        onClick={() => scrollToSection('how-it-works')}
                        className="font-[family-name:var(--font-display)] text-[10px] tracking-[0.22em] text-white/70 hover:text-cyan-400 uppercase transition-all cursor-pointer font-semibold"
                    >
                        How It Works
                    </button>
                    <button
                        onClick={() => scrollToSection('pricing')}
                        className="font-[family-name:var(--font-display)] text-[10px] tracking-[0.22em] text-white/70 hover:text-cyan-400 uppercase transition-all cursor-pointer font-semibold"
                    >
                        Pricing
                    </button>
                    <button
                        onClick={() => scrollToSection('faq')}
                        className="font-[family-name:var(--font-display)] text-[10px] tracking-[0.22em] text-white/70 hover:text-cyan-400 uppercase transition-all cursor-pointer font-semibold"
                    >
                        FAQ
                    </button>

                    {/* Language Switcher */}
                    <button
                        onClick={() => setLocale(locale === 'en' ? 'es' : 'en')}
                        className="flex items-center gap-1 font-[family-name:var(--font-display)] text-[10px] tracking-[0.15em] text-white/50 hover:text-cyan-400 uppercase transition-all cursor-pointer"
                        aria-label="Switch language"
                    >
                        <Globe className="h-3.5 w-3.5" />
                        <span>{locale === 'en' ? 'EN' : 'ES'}</span>
                    </button>

                    {/* Sign In */}
                    <button
                        onClick={() => openAuthModal('signin')}
                        className="font-[family-name:var(--font-display)] text-[10px] tracking-[0.22em] text-white/70 hover:text-cyan-400 uppercase transition-all cursor-pointer font-semibold"
                    >
                        {t('landingSignIn')}
                    </button>
                </div>

                {/* CTA + Mobile */}
                <div className="flex items-center gap-2 sm:gap-3">
                    <button
                        onClick={() => openAuthModal('signup')}
                        className="hidden sm:inline-flex px-5 py-2 rounded-full font-[family-name:var(--font-display)] text-[10px] font-bold tracking-wider text-slate-950 premium-btn-white text-center cursor-pointer uppercase"
                    >
                        {t('landingGetStarted')}
                    </button>

                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden p-1.5 rounded-full border border-white/10 text-white/70 hover:text-[#64d2ff] hover:bg-white/5 transition-all outline-none"
                    >
                        {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Mobile Drawer */}
            {mobileMenuOpen && (
                <div className="absolute top-20 left-0 w-full bg-[#0a0e17]/95 border border-[rgba(100,210,255,0.15)] rounded-2xl p-5 flex flex-col gap-4 shadow-2xl backdrop-blur-xl md:hidden">
                    <button onClick={() => scrollToSection('features')} className="py-2.5 text-left font-[family-name:var(--font-display)] text-xs tracking-[0.2em] text-white/80 hover:text-[#64d2ff] uppercase transition-colors">
                        Features
                    </button>
                    <button onClick={() => scrollToSection('how-it-works')} className="py-2.5 text-left font-[family-name:var(--font-display)] text-xs tracking-[0.2em] text-white/80 hover:text-[#64d2ff] uppercase transition-colors">
                        How It Works
                    </button>
                    <button onClick={() => scrollToSection('pricing')} className="py-2.5 text-left font-[family-name:var(--font-display)] text-xs tracking-[0.2em] text-white/80 hover:text-[#64d2ff] uppercase transition-colors">
                        Pricing
                    </button>
                    <button onClick={() => scrollToSection('faq')} className="py-2.5 text-left font-[family-name:var(--font-display)] text-xs tracking-[0.2em] text-white/80 hover:text-[#64d2ff] uppercase transition-colors">
                        FAQ
                    </button>
                    <button
                        onClick={() => setLocale(locale === 'en' ? 'es' : 'en')}
                        className="py-2.5 text-left font-[family-name:var(--font-display)] text-xs tracking-[0.2em] text-white/80 hover:text-[#64d2ff] uppercase transition-colors flex items-center gap-2"
                    >
                        <Globe className="h-3.5 w-3.5" />
                        {locale === 'en' ? 'English' : 'Español'}
                    </button>
                    <button onClick={() => { openAuthModal('signin'); setMobileMenuOpen(false); }} className="py-2.5 text-left font-[family-name:var(--font-display)] text-xs tracking-[0.2em] text-white/80 hover:text-[#64d2ff] uppercase transition-colors">
                        {t('landingSignIn')}
                    </button>
                    <div className="h-[1px] bg-white/5 my-1" />
                    <button
                        onClick={() => { openAuthModal('signup'); setMobileMenuOpen(false); }}
                        className="w-full py-3 rounded-xl font-[family-name:var(--font-display)] text-[11px] tracking-wider text-cyan-400 font-semibold premium-btn-cyan text-center uppercase"
                    >
                        {t('landingGetStarted')}
                    </button>
                </div>
            )}
        </nav>
    );
}

// ─── Hero Section (NO VIDEO) ─────────────────────────────────────────
function HeroSection({
    openAuthModal,
    t,
}: {
    openAuthModal: (tab: 'signin' | 'signup') => void;
    t: TranslationFn;
}) {
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.12, delayChildren: 0.15 },
        },
    };

    const childVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
        },
    };

    return (
        <section className="relative h-svh w-full flex items-center pl-[6%] pt-24 overflow-hidden">
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="max-w-[min(540px,85vw)] flex flex-col items-start gap-6 relative z-10 pointer-events-auto"
            >
                {/* Eyebrow label */}
                <motion.div variants={childVariants} className="flex items-center gap-3">
                    <div className="w-8 h-[1.5px] bg-cyan-400" />
                    <span className="font-[family-name:var(--font-jetbrains)] text-[10px] font-bold tracking-[0.3rem] uppercase text-cyan-400">
                        {t('heroStat1')}
                    </span>
                </motion.div>

                {/* Cormorant Garamond Editorial Headline */}
                <motion.h1 variants={childVariants} className="font-[family-name:var(--font-serif)] italic text-4xl sm:text-5xl md:text-7xl text-white text-left tracking-tight leading-[1.05] max-w-[500px]">
                    {t('heroHeadline').split(',').map((part, i, arr) => (
                        <React.Fragment key={i}>
                            {i === arr.length - 1 ? (
                                <span className="not-italic font-light text-slate-200">{part}</span>
                            ) : (
                                part + ','
                            )}
                        </React.Fragment>
                    ))}
                </motion.h1>

                {/* Subtitle */}
                <motion.p variants={childVariants} className="font-sans text-[0.85rem] text-blue-100/60 max-w-[28rem] font-light leading-relaxed">
                    {t('heroSubtitle')}
                </motion.p>

                {/* CTA Buttons */}
                <motion.div variants={childVariants} className="flex items-center gap-4 sm:gap-8 pt-3">
                    <button
                        onClick={() => openAuthModal('signup')}
                        className="relative px-6 sm:px-8 py-3 rounded-xl text-cyan-400 font-[family-name:var(--font-display)] font-bold text-xs tracking-[0.15em] uppercase premium-btn-cyan cursor-pointer shadow-[0_0_25px_rgba(34,211,238,0.25)]"
                    >
                        {t('heroCtaPrimary')}
                    </button>
                    <button
                        onClick={() => {
                            const el = document.getElementById('how-it-works');
                            el?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="flex items-center gap-3 font-[family-name:var(--font-display)] text-xs font-bold uppercase tracking-[0.1em] text-white/80 hover:text-cyan-400 transition-all cursor-pointer group"
                    >
                        <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center group-hover:border-cyan-400 group-hover:bg-cyan-400/10 transition-all">
                            <Play className="w-3.5 h-3.5 text-white group-hover:text-cyan-400 fill-current ml-0.5" />
                        </div>
                        {t('heroCtaSecondary')}
                    </button>
                </motion.div>
            </motion.div>

            {/* Bottom stats row */}
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.8, ease: 'easeOut' }}
                className="absolute bottom-12 left-[6%] flex flex-wrap items-center gap-x-8 sm:gap-x-12 gap-y-3 text-[9px] font-bold tracking-[0.3em] uppercase text-white/40 pointer-events-none"
            >
                <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                    {t('heroStat1')}
                </div>
                <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full border border-white/40" />
                    {t('heroStat2')}
                </div>
                <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full border border-white/40" />
                    {t('heroStat3')}
                </div>
            </motion.div>

            {/* Scroll indicator */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
                <button
                    onClick={() => {
                        const el = document.getElementById('features');
                        el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="flex flex-col items-center gap-1 text-cyan-400/50 hover:text-cyan-400 transition-colors"
                    aria-label="Scroll down"
                >
                    <ChevronUp className="h-5 w-5 rotate-180" />
                </button>
            </div>
        </section>
    );
}

// ─── How It Works Section ────────────────────────────────────────────
function HowItWorksSection({ t }: { t: TranslationFn }) {
    const steps = [
        {
            id: 'step-1',
            number: '01',
            icon: <Upload className="w-5 h-5 text-[#64d2ff]" />,
            title: t('step1Title'),
            description: t('step1Desc'),
            theme: '01-Upload',
            align: 'left' as const,
        },
        {
            id: 'step-2',
            number: '02',
            icon: <MessageCircle className="w-5 h-5 text-[#64d2ff]" />,
            title: t('step2Title'),
            description: t('step2Desc'),
            theme: '02-Ask',
            align: 'right' as const,
        },
        {
            id: 'step-3',
            number: '03',
            icon: <Sparkles className="w-5 h-5 text-[#64d2ff]" />,
            title: t('step3Title'),
            description: t('step3Desc'),
            theme: '03-Insights',
            align: 'left' as const,
        },
    ];

    return (
        <section id="how-it-works" className="w-full relative pb-12 pointer-events-auto">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-xl mb-8 pl-[6%] pt-16"
            >
                <div className="flex items-center gap-3 mb-4">
                    <span className="w-8 h-[1.5px] bg-cyan-400" />
                    <span className="font-[family-name:var(--font-jetbrains)] text-[10px] tracking-[0.3em] uppercase text-cyan-400 font-bold">
                        Milestones
                    </span>
                </div>
                <h2 className="font-[family-name:var(--font-display)] font-medium text-3xl md:text-5xl text-white tracking-tight leading-none">
                    {t('howItWorksTitle').split(' ').map((word, i, arr) =>
                        i === arr.length - 1 ? (
                            <span key={i} className="italic font-[family-name:var(--font-serif)] text-slate-300"> {word}</span>
                        ) : (
                            <React.Fragment key={i}>{i > 0 ? ' ' : ''}{word}</React.Fragment>
                        )
                    )}
                </h2>
                <p className="font-sans text-xs text-slate-400 mt-3 max-w-md font-light">
                    {t('howItWorksSubtitle')}
                </p>
            </motion.div>

            <div className="flex flex-col w-full relative z-10">
                {steps.map((step) => (
                    <Card3D
                        key={step.id}
                        id={step.id}
                        index={step.number}
                        theme={step.theme}
                        title={step.title}
                        description={step.description}
                        align={step.align}
                        icon={step.icon}
                    />
                ))}
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
    t: TranslationFn;
}) {
    const handlePlanCta = (planId: string) => {
        if (planId !== 'free') {
            setPendingUpgradePlan(planId);
        }
        openAuthModal('signup');
    };

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

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.15 },
        },
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 35 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.75, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
        },
    };

    return (
        <section id="pricing" className="w-full py-24 flex flex-col items-center justify-center relative pointer-events-auto">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-xl mx-auto text-center px-6 mb-16 relative z-10"
            >
                <div className="px-3 py-1 rounded-full bg-cyan-400/5 border border-cyan-400/10 font-[family-name:var(--font-jetbrains)] text-[9px] tracking-[0.25em] uppercase text-[#64d2ff] inline-block mb-4">
                    TRANSPARENT VALUE ENGINE
                </div>
                <h2 className="font-[family-name:var(--font-display)] font-medium text-3xl md:text-5xl text-white tracking-tight leading-none mb-3">
                    {t('pricingTitle').split(' ').map((word, i, arr) =>
                        i === arr.length - 1 ? (
                            <span key={i} className="italic font-[family-name:var(--font-serif)] text-slate-300"> {word}</span>
                        ) : (
                            <React.Fragment key={i}>{i > 0 ? ' ' : ''}{word}</React.Fragment>
                        )
                    )}
                </h2>
                <p className="font-sans text-xs md:text-sm text-slate-400 font-light">
                    {t('pricingSubtitle')}
                </p>
            </motion.div>

            <motion.div
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-100px' }}
                className="w-full max-w-[1340px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 xl:gap-4 px-4 relative z-10"
            >
                {PLAN_ORDER.map((planId, planIndex) => {
                    const plan = PLANS[planId];
                    const popular = isPopular(planId);
                    const features = getPlanFeatures(planId);
                    const planName = locale === 'es' ? plan.nameEs : plan.name;

                    return (
                        <motion.div
                            key={planId}
                            variants={cardVariants}
                            className={`rounded-2xl p-5 flex flex-col justify-between shadow-2xl relative overflow-hidden group transition-all duration-300 ${
                                popular
                                    ? 'glass-panel border-emerald-500/40 bg-emerald-950/5 hover:border-emerald-400/60 hover:shadow-[0_0_25px_rgba(16,185,129,0.15)]'
                                    : 'glass-panel hover:border-cyan-400/20 hover:shadow-[0_0_20px_rgba(100,210,255,0.05)]'
                            }`}
                        >
                            {popular && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2">
                                    <span className="inline-block bg-[#00a86b] text-white font-[family-name:var(--font-display)] text-[8px] uppercase tracking-widest px-3 py-1 rounded-b-lg font-bold">
                                        {t('pricingPopular')}
                                    </span>
                                </div>
                            )}

                            <div className="absolute top-0 right-0 w-32 h-32 bg-[radial-gradient(ellipse_at_top_right,rgba(100,210,255,0.03)_0%,transparent_70%)] pointer-events-none" />

                            <div className={popular ? 'pt-2' : ''}>
                                <div className="flex items-center justify-between mb-4">
                                    <span className="font-[family-name:var(--font-jetbrains)] text-[8px] text-slate-500 tracking-wider">
                                        {`0${planIndex + 1} // ${planId.toUpperCase()}`}
                                    </span>
                                </div>

                                <h3 className={`font-[family-name:var(--font-display)] text-lg font-bold mb-1 ${popular ? 'text-white' : 'text-slate-200'}`}>
                                    {planName}
                                </h3>

                                <div className="flex items-baseline gap-1 border-b border-white/5 pb-4 mb-6">
                                    <span className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-white tracking-tight">
                                        {plan.priceDisplay}
                                    </span>
                                    <span className="text-slate-500 font-[family-name:var(--font-jetbrains)] text-[9px] tracking-wider uppercase">
                                        {t('pricingPerMonth')}
                                    </span>
                                </div>

                                <ul className="flex flex-col gap-2.5 mb-8">
                                    {features.map((feature) => (
                                        <li key={feature} className="flex items-start gap-2 text-[11px] text-slate-400">
                                            <Check className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${popular ? 'text-emerald-400' : 'text-emerald-500/80'}`} />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <button
                                onClick={() => handlePlanCta(planId)}
                                className={`w-full py-2.5 rounded-xl font-[family-name:var(--font-display)] text-[10px] text-center font-bold tracking-wide cursor-pointer uppercase ${
                                    popular
                                        ? 'premium-btn-emerald text-white'
                                        : planId === 'free'
                                            ? 'premium-btn-cyan text-cyan-400'
                                            : 'premium-btn-cyan text-cyan-400'
                                }`}
                            >
                                {t('pricingCta')}
                            </button>
                        </motion.div>
                    );
                })}
            </motion.div>
        </section>
    );
}

// ─── FAQ Section (Custom Glass Accordion) ────────────────────────────
function FAQSection({ t }: { t: TranslationFn }) {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const faqs = [
        { q: t('faqQ1'), a: t('faqA1') },
        { q: t('faqQ2'), a: t('faqA2') },
        { q: t('faqQ3'), a: t('faqA3') },
        { q: t('faqQ4'), a: t('faqA4') },
        { q: t('faqQ5'), a: t('faqA5') },
        { q: t('faqQ6'), a: t('faqA6') },
    ];

    return (
        <section id="faq" className="w-full py-24 flex flex-col items-center justify-center relative px-4 pointer-events-auto">
            {/* Decorative background blob */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-cyan-500/5 blur-[80px] pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-xl mx-auto text-center mb-16 relative z-10"
            >
                <div className="px-3 py-1 rounded-full bg-cyan-400/5 border border-cyan-400/10 font-[family-name:var(--font-jetbrains)] text-[9px] tracking-[0.25em] uppercase text-cyan-400 inline-flex items-center gap-1.5 mb-4">
                    <span>❓</span>
                    <span>HELP_DESK_PROTOCOL</span>
                </div>
                <h2 className="font-[family-name:var(--font-display)] font-medium text-3xl md:text-5xl text-white tracking-tight leading-none mb-3">
                    {t('faqTitle').split(' ').map((word, i, arr) =>
                        i === arr.length - 1 ? (
                            <span key={i} className="italic font-[family-name:var(--font-serif)] text-slate-300"> {word}</span>
                        ) : (
                            <React.Fragment key={i}>{i > 0 ? ' ' : ''}{word}</React.Fragment>
                        )
                    )}
                </h2>
            </motion.div>

            <div className="w-full max-w-[min(680px,92vw)] mx-auto flex flex-col gap-4 relative z-10">
                {faqs.map((faq, index) => {
                    const isOpen = openIndex === index;
                    return (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-50px' }}
                            transition={{ duration: 0.5, delay: index * 0.08 }}
                            className={`glass-panel rounded-xl overflow-hidden transition-all duration-300 ${
                                isOpen ? 'border-cyan-400/30 bg-slate-950/50' : 'hover:border-cyan-400/15'
                            }`}
                        >
                            <button
                                onClick={() => setOpenIndex(isOpen ? null : index)}
                                className="w-full py-5 px-6 flex items-center justify-between text-left gap-4 transition-colors cursor-pointer"
                            >
                                <div className="flex items-center gap-3">
                                    <span className={`font-[family-name:var(--font-jetbrains)] text-[10px] ${isOpen ? 'text-cyan-400' : 'text-slate-500'}`}>
                                        FAQ // 0{index + 1}
                                    </span>
                                    <span className="font-[family-name:var(--font-display)] font-semibold text-xs md:text-sm text-slate-100 hover:text-white transition-colors">
                                        {faq.q}
                                    </span>
                                </div>
                                <ChevronDown
                                    className={`w-4 h-4 text-slate-400 transition-transform duration-300 shrink-0 ${
                                        isOpen ? 'rotate-180 text-cyan-400' : ''
                                    }`}
                                />
                            </button>
                            <div
                                className={`transition-all duration-300 ease-in-out overflow-hidden ${
                                    isOpen ? 'max-h-[300px] border-t border-white/5 py-4 px-6 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
                                }`}
                            >
                                <p className="font-sans text-xs text-slate-400 leading-relaxed font-light">
                                    {faq.a}
                                </p>
                            </div>
                        </motion.div>
                    );
                })}
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
    t: TranslationFn;
}) {
    return (
        <section className="w-full py-24 flex flex-col items-center justify-center relative px-4 pointer-events-auto">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-2xl mx-auto glass-panel rounded-2xl p-8 md:p-12 text-center relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-40 h-40 bg-[radial-gradient(ellipse_at_top_right,rgba(100,210,255,0.05)_0%,transparent_70%)] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[20%] h-[2px] bg-gradient-to-r from-cyan-500 to-transparent" />
                <h2 className="font-[family-name:var(--font-display)] font-medium text-2xl md:text-4xl text-white tracking-tight mb-4">
                    {t('finalCtaTitle').split(' ').map((word, i, arr) =>
                        i === arr.length - 2 ? (
                            <span key={i} className="italic font-[family-name:var(--font-serif)] text-slate-300"> {word}</span>
                        ) : (
                            <React.Fragment key={i}>{i > 0 ? ' ' : ''}{word}</React.Fragment>
                        )
                    )}
                </h2>
                <p className="font-sans text-xs md:text-sm text-slate-400 font-light mb-8 max-w-lg mx-auto">
                    {t('finalCtaSubtitle')}
                </p>
                <button
                    onClick={() => openAuthModal('signup')}
                    className="px-8 py-3 rounded-xl text-cyan-400 font-[family-name:var(--font-display)] font-bold text-xs tracking-[0.15em] uppercase premium-btn-cyan cursor-pointer shadow-[0_0_25px_rgba(34,211,238,0.25)]"
                >
                    {t('finalCtaButton')}
                    <ArrowRight className="ml-2 h-4 w-4 inline" />
                </button>
            </motion.div>
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
    t: TranslationFn;
}) {
    return (
        <footer className="relative z-10 bg-[#060910]/80 backdrop-blur-md border-t border-cyan-500/5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {/* Brand */}
                    <div className="sm:col-span-2 lg:col-span-1">
                        <div className="flex items-center gap-2.5 mb-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/10 border border-cyan-500/20">
                                <Brain className="h-4 w-4 text-[#64d2ff]" />
                            </div>
                            <span className="font-[family-name:var(--font-display)] text-sm font-bold text-white tracking-wider">DataMind BI</span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            {t('footerTagline')}
                        </p>
                    </div>

                    {/* Product */}
                    <div>
                        <h4 className="font-[family-name:var(--font-display)] text-[10px] font-bold text-white/60 tracking-[0.2em] uppercase mb-3">{t('footerProduct')}</h4>
                        <ul className="space-y-2">
                            <li>
                                <a href="#features" className="text-xs text-slate-500 hover:text-cyan-400 transition-colors">
                                    {t('footerFeatures')}
                                </a>
                            </li>
                            <li>
                                <a href="#pricing" className="text-xs text-slate-500 hover:text-cyan-400 transition-colors">
                                    {t('footerPricing')}
                                </a>
                            </li>
                            <li>
                                <a href="#" className="text-xs text-slate-500 hover:text-cyan-400 transition-colors">
                                    {t('footerDocumentation')}
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Company */}
                    <div>
                        <h4 className="font-[family-name:var(--font-display)] text-[10px] font-bold text-white/60 tracking-[0.2em] uppercase mb-3">{t('footerCompany')}</h4>
                        <ul className="space-y-2">
                            <li>
                                <a href="#" className="text-xs text-slate-500 hover:text-cyan-400 transition-colors">
                                    {t('footerAbout')}
                                </a>
                            </li>
                            <li>
                                <a href="#" className="text-xs text-slate-500 hover:text-cyan-400 transition-colors">
                                    {t('footerBlog')}
                                </a>
                            </li>
                            <li>
                                <a href="#" className="text-xs text-slate-500 hover:text-cyan-400 transition-colors">
                                    {t('footerCareers')}
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h4 className="font-[family-name:var(--font-display)] text-[10px] font-bold text-white/60 tracking-[0.2em] uppercase mb-3">{t('footerLegal')}</h4>
                        <ul className="space-y-2">
                            <li>
                                <a href="#" className="text-xs text-slate-500 hover:text-cyan-400 transition-colors">
                                    {t('footerPrivacy')}
                                </a>
                            </li>
                            <li>
                                <a href="#" className="text-xs text-slate-500 hover:text-cyan-400 transition-colors">
                                    {t('footerTerms')}
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="mt-10 pt-6 border-t border-cyan-500/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="font-[family-name:var(--font-jetbrains)] text-[9px] text-slate-600 tracking-wider">
                        &copy; {new Date().getFullYear()} DataMind BI. {t('footerCopyright')}
                    </p>
                    <button
                        onClick={() => setLocale(locale === 'en' ? 'es' : 'en')}
                        className="flex items-center gap-1.5 font-[family-name:var(--font-jetbrains)] text-[9px] text-slate-600 hover:text-cyan-400 transition-colors tracking-wider"
                    >
                        <Globe className="h-3 w-3" />
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
            className={`fixed bottom-6 right-6 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/20 border border-cyan-400/30 text-[#64d2ff] shadow-lg shadow-cyan-500/10 transition-all duration-300 hover:bg-cyan-500/30 hover:border-cyan-400/50 ${
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
    const [scrollY, setScrollY] = useState(0);
    const [scrollProgress, setScrollProgress] = useState(0);
    const [showScrollTop, setShowScrollTop] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            const currentY = window.scrollY;
            const docHeight = document.documentElement.scrollHeight;
            const winHeight = window.innerHeight;
            const maxScroll = docHeight - winHeight;
            const progress = maxScroll > 0 ? currentY / maxScroll : 0;

            setScrollY(currentY);
            setScrollProgress(progress);
            setShowScrollTop(currentY > 600);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="landing-page min-h-screen flex flex-col bg-[#060910]">
            <ProgressIndicator scrollProgress={scrollProgress} />
            <Navbar
                locale={locale}
                setLocale={setLocale}
                openAuthModal={openAuthModal}
                t={t}
            />
            <BackgroundTimeline scrollProgress={scrollProgress} scrollY={scrollY} />

            <div className="relative z-10 w-full pointer-events-none select-none">
                <HeroSection openAuthModal={openAuthModal} t={t} />
                <FeaturesBento t={t} />
                <HowItWorksSection t={t} />
                <PricingSection locale={locale} openAuthModal={openAuthModal} t={t} />
                <FAQSection t={t} />
                <FinalCTASection openAuthModal={openAuthModal} t={t} />
            </div>

            <Footer locale={locale} setLocale={setLocale} t={t} />
            <ScrollToTopButton visible={showScrollTop} onClick={scrollToTop} />
        </div>
    );
}
