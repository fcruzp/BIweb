'use client';

import React, { useRef } from 'react';
import { motion } from 'framer-motion';

interface Card3DProps {
  id: string;
  index: string;
  title: string;
  description: string;
  theme: string;
  icon: React.ReactNode;
  align: 'left' | 'right';
}

export function Card3D({
  id,
  index,
  title,
  description,
  theme,
  icon,
  align,
}: Card3DProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = -((y - centerY) / rect.height) * 22;
    const rotateY = ((x - centerX) / rect.width) * 22;

    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`;

    const shine = card.querySelector('.card-shine') as HTMLDivElement;
    if (shine) {
      const percentageX = (x / rect.width) * 100;
      const percentageY = (y / rect.height) * 100;
      shine.style.background = `radial-gradient(circle at ${percentageX}% ${percentageY}%, rgba(100, 210, 255, 0.15) 0%, transparent 60%)`;
    }
  };

  const handleMouseLeave = () => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;

    const shine = card.querySelector('.card-shine') as HTMLDivElement;
    if (shine) {
      shine.style.background = 'transparent';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 60, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className={`w-full flex ${
        align === 'left' ? 'justify-start md:pl-[6%]' : 'justify-end md:pr-[6%]'
      } py-8 pointer-events-none`}
    >
      <div
        className="w-full flex pointer-events-none"
        style={{ justifyContent: align === 'left' ? 'flex-start' : 'flex-end' }}
      >
        <div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="card-3d glass-panel relative w-full max-w-[min(480px,90vw)] min-h-[220px] rounded-2xl p-6 md:p-8 flex flex-col justify-between overflow-hidden shadow-[0_15px_45px_rgba(3,7,18,0.5)] transition-transform duration-400 ease-out pointer-events-auto cursor-pointer"
          style={{
            backgroundImage: 'radial-gradient(rgba(100, 210, 255, 0.05) 1.2px, transparent 1.2px)',
            backgroundSize: '20px 20px',
          }}
        >
          {/* Shine overlay */}
          <div className="card-shine absolute inset-0 pointer-events-none transition-opacity duration-300" />

          {/* Floating background index glow banner */}
          <div className="absolute top-4 right-6 text-white/5 font-[family-name:var(--font-display)] text-8xl font-black select-none pointer-events-none tracking-tighter">
            {index}
          </div>

          {/* Card Header Label Info */}
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="font-[family-name:var(--font-jetbrains)] text-xs font-bold text-cyan-400 tracking-wider uppercase">
              {index} — {theme.split('-')[1]?.toUpperCase() || theme.toUpperCase()}
            </div>
            <div className="text-white/40 group-hover:text-cyan-400 transition-colors">
              {icon}
            </div>
          </div>

          {/* Bottom index, header & description text */}
          <div className="relative z-10 mt-auto">
            <div className="flex items-baseline gap-2 mb-1.5">
              <span className="font-[family-name:var(--font-display)] font-medium text-xs text-[#64d2ff] tracking-wide">
                M_0{index}
              </span>
              <h3 className="font-[family-name:var(--font-display)] font-semibold text-lg text-white">
                {title}
              </h3>
            </div>
            <p className="font-sans text-xs text-slate-300 leading-relaxed font-light">
              {description}
            </p>
          </div>

          {/* Corner Accent indicator */}
          <div className="absolute bottom-0 left-0 w-[20%] h-[2px] bg-gradient-to-r from-cyan-500 to-transparent" />
        </div>
      </div>
    </motion.div>
  );
}
