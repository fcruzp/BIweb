'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';

interface FeaturesBentoProps {
  t: (key: string) => string;
}

export function FeaturesBento({ t }: FeaturesBentoProps) {
  // Typewriter effect for chat panel
  const [typedMessage, setTypedMessage] = useState('');
  const [hasStartedTyping, setHasStartedTyping] = useState(false);
  const fullResponse = t('feature2Desc') + ' ' + t('feature2Bullet1');

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.1 },
    },
  };

  const panelVariants = {
    hidden: { opacity: 0, y: 40, scale: 0.96 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <section id="features" className="w-full relative py-24 px-4 sm:px-6 lg:px-8 pointer-events-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 35 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-3xl mx-auto text-center mb-16"
      >
        <div className="inline-flex items-center gap-2 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-[family-name:var(--font-jetbrains)] text-[9px] tracking-[0.25em] uppercase text-[#64d2ff]">
            SYSTEM SCHEMA METADATA
          </span>
        </div>
        <h2 className="font-[family-name:var(--font-display)] font-medium text-3xl md:text-5xl text-white tracking-tight leading-none mb-4">
          {t('featuresTitle').split(' ').map((word, i, arr) =>
            i === arr.length - 2 ? (
              <span key={i} className="italic font-[family-name:var(--font-serif)] text-slate-300"> {word}</span>
            ) : (
              <React.Fragment key={i}>{i > 0 ? ' ' : ''}{word}</React.Fragment>
            )
          )}
        </h2>
        <p className="font-sans text-xs md:text-sm text-slate-400 max-w-lg mx-auto font-light">
          {t('featuresSubtitle')}
        </p>
      </motion.div>

      {/* Bento Grid - 2x2 on desktop */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-50px' }}
        className="w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        {/* Panel 1: Chat Interface */}
        <motion.div variants={panelVariants} className="md:row-span-1">
          <ChatPanel t={t} typedMessage={typedMessage} setTypedMessage={setTypedMessage} hasStartedTyping={hasStartedTyping} setHasStartedTyping={setHasStartedTyping} fullResponse={fullResponse} />
        </motion.div>

        {/* Panel 2: Geographic/Heatmap */}
        <motion.div variants={panelVariants} className="md:row-span-1">
          <GeoPanel t={t} />
        </motion.div>

        {/* Panel 3: SQL Relations */}
        <motion.div variants={panelVariants} className="md:row-span-1">
          <SQLPanel t={t} />
        </motion.div>

        {/* Panel 4: NLP Tokenizer */}
        <motion.div variants={panelVariants} className="md:row-span-1">
          <TokenizerPanel t={t} />
        </motion.div>
      </motion.div>
    </section>
  );
}

function ChatPanel({ t, typedMessage, setTypedMessage, hasStartedTyping, setHasStartedTyping, fullResponse }: {
  t: (key: string) => string;
  typedMessage: string;
  setTypedMessage: (v: string) => void;
  hasStartedTyping: boolean;
  setHasStartedTyping: (v: boolean) => void;
  fullResponse: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStartedTyping) {
          setHasStartedTyping(true);
          let index = 0;
          setTypedMessage('');
          const interval = setInterval(() => {
            setTypedMessage(fullResponse.substring(0, index + 1));
            index++;
            if (index >= fullResponse.length) {
              clearInterval(interval);
            }
          }, 35);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [hasStartedTyping, fullResponse, setTypedMessage, setHasStartedTyping]);

  return (
    <div ref={ref} className="glass-panel rounded-2xl overflow-hidden shadow-2xl h-full">
      <div className="px-4 py-3 bg-slate-950/80 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 text-[#64d2ff]">💬</div>
          <span className="font-[family-name:var(--font-jetbrains)] text-[10px] tracking-wider text-slate-300 font-medium">
            S_QA_INTERPRETER.EXE
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-[family-name:var(--font-jetbrains)] text-[8px] text-emerald-400 tracking-wider uppercase">
            READY
          </span>
        </div>
      </div>
      <div className="p-5 flex flex-col gap-4 bg-[#0a0e17]/40">
        <div className="flex flex-col gap-1.5 items-end self-end max-w-[85%]">
          <div className="p-3.5 rounded-2xl bg-slate-800 border border-white/10 text-white text-xs leading-relaxed font-light">
            {t('feature2Bullet1')}
          </div>
          <span className="font-[family-name:var(--font-jetbrains)] text-[8px] text-white/30 mr-1">
            USER:09:41 UTC
          </span>
        </div>
        <div className="flex flex-col gap-1.5 items-start self-start max-w-[90%]">
          <div className="p-4 rounded-2xl bg-[#060910] border border-cyan-500/10 text-slate-300 text-xs leading-relaxed font-light font-[family-name:var(--font-jetbrains)] min-h-[96px]">
            {typedMessage}
            <span className="w-1.5 h-3 bg-[#64d2ff] inline-block animate-pulse ml-0.5" />
          </div>
          <span className="font-[family-name:var(--font-jetbrains)] text-[8px] text-[#64d2ff]/40 ml-1">
            DATAMIND AI AGENT [COMPILING]
          </span>
        </div>
      </div>
    </div>
  );
}

function GeoPanel({ t }: { t: (key: string) => string }) {
  return (
    <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl h-full">
      <div className="px-4 py-3 bg-slate-950/80 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-purple-400">🌐</span>
          <span className="font-[family-name:var(--font-jetbrains)] text-[10px] tracking-wider text-slate-300 font-medium">
            GEOGRAPHIC_DENSITY.MAP
          </span>
        </div>
        <span className="font-[family-name:var(--font-jetbrains)] text-[9px] text-purple-400 tracking-widest uppercase">
          ACTIVE
        </span>
      </div>
      <div className="p-5 bg-gradient-to-b from-[#0a0e17]/30 to-[#060910]/80 flex flex-col gap-4">
        <div className="relative h-44 rounded-xl border border-white/5 bg-[#060910] overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff03_1px,transparent_1px)] bg-[size:12px_12px]" />
          <div className="absolute top-[28%] left-[45%]">
            <span className="absolute inline-flex h-6 w-6 rounded-full bg-cyan-400 opacity-20 animate-ping" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-cyan-500 border border-white" />
          </div>
          <div className="absolute top-[68%] left-[75%]">
            <span className="absolute inline-flex h-8 w-8 rounded-full bg-purple-400 opacity-25 animate-ping" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-purple-500 border border-white" />
          </div>
          <div className="absolute bottom-3 left-3 bg-slate-950/90 border border-white/10 px-2.5 py-1.5 rounded-md font-[family-name:var(--font-jetbrains)] text-[9px]">
            <div className="text-[#64d2ff] font-bold">{t('feature3Bullet2')}</div>
            <div className="text-purple-400">LATENCY 14ms</div>
          </div>
        </div>
        <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
          <div className="flex flex-col">
            <span className="font-[family-name:var(--font-jetbrains)] text-[9px] text-slate-400">{t('feature3Title')}</span>
            <span className="font-[family-name:var(--font-display)] font-semibold text-xs text-white">{t('feature3Desc')}</span>
          </div>
          <div className="text-right flex flex-col">
            <span className="font-[family-name:var(--font-jetbrains)] text-[9px] text-[#64d2ff]">STREAK</span>
            <span className="font-[family-name:var(--font-jetbrains)] font-medium text-xs text-white">99.98% uptime</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SQLPanel({ t }: { t: (key: string) => string }) {
  return (
    <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl h-full">
      <div className="px-4 py-3 bg-slate-950/80 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-emerald-400">🗄️</span>
          <span className="font-[family-name:var(--font-jetbrains)] text-[10px] tracking-wider text-slate-300 font-medium">
            SCHEMA_DOCKER_CONTAINER
          </span>
        </div>
        <span className="text-slate-500 text-sm">⌨️</span>
      </div>
      <div className="p-5 flex flex-col gap-3 bg-[#0a0e17]/50">
        <div className="font-[family-name:var(--font-jetbrains)] text-[10px] text-emerald-400 py-1.5 bg-black/40 px-3 rounded border border-emerald-500/10 mb-2">
          $ EXPLAIN ANALYZE SELECT * FROM {t('feature1Title')}...
        </div>
        <div className="flex flex-col gap-2">
          <div className="p-2.5 rounded-lg bg-[#060910] border border-white/5 flex items-center justify-between">
            <span className="font-[family-name:var(--font-jetbrains)] text-xs text-slate-300">{t('feature1Bullet2')}</span>
            <span className="font-[family-name:var(--font-jetbrains)] text-[9px] text-stone-500 tracking-wider">PRIMARY_KEY</span>
          </div>
          <div className="flex justify-center py-1">
            <div className="w-[1px] h-6 bg-cyan-500/40 relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400" />
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-[#060910] border border-[#64d2ff]/20 flex items-center justify-between">
            <span className="font-[family-name:var(--font-jetbrains)] text-xs text-slate-300">{t('feature1Bullet3')}</span>
            <span className="font-[family-name:var(--font-jetbrains)] text-[9px] text-[#64d2ff] tracking-wider font-semibold">JOIN_RESOLVED (4ms)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TokenizerPanel({ t }: { t: (key: string) => string }) {
  return (
    <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl h-full">
      <div className="px-4 py-3 bg-slate-950/80 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[#64d2ff]">⚙️</span>
          <span className="font-[family-name:var(--font-jetbrains)] text-[10px] tracking-wider text-slate-300 font-medium">
            NATURAL_LANGUAGE_TOKENIZER
          </span>
        </div>
      </div>
      <div className="p-5 bg-[#0a0e17]/50 flex flex-col gap-4">
        <div className="font-sans text-xs text-slate-300 bg-black/20 p-3 rounded-lg border border-white/5 leading-relaxed">
          &quot;{t('feature2Bullet1')}&quot;
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
            <div className="font-[family-name:var(--font-jetbrains)] text-[8px] text-[#64d2ff] tracking-wider">TARGET_ENTITY</div>
            <div className="font-[family-name:var(--font-display)] font-bold text-sm text-white">{t('feature1Title')}</div>
            <div className="font-[family-name:var(--font-jetbrains)] text-[9px] text-slate-400 mt-1">Class: SchemaData</div>
          </div>
          <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
            <div className="font-[family-name:var(--font-jetbrains)] text-[8px] text-purple-400 tracking-wider">FILTER_COMPARATOR</div>
            <div className="font-[family-name:var(--font-display)] font-bold text-sm text-white">{t('feature3Title')}</div>
            <div className="font-[family-name:var(--font-jetbrains)] text-[9px] text-slate-400 mt-1">Class: VisualOutput</div>
          </div>
        </div>
        <div className="flex items-center gap-2.5 text-[#64d2ff] text-xs font-[family-name:var(--font-jetbrains)] font-medium">
          <span className="text-emerald-400">✓</span>
          <span>{t('feature2Bullet3')}</span>
        </div>
      </div>
    </div>
  );
}
