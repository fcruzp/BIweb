'use client';

import React, { useEffect, useRef } from 'react';

interface BackgroundTimelineProps {
  scrollProgress: number;
  scrollY: number;
}

export function BackgroundTimeline({ scrollProgress, scrollY }: BackgroundTimelineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Dynamic data packets flowing
    interface Packet {
      x: number;
      y: number;
      speed: number;
      length: number;
      angle: number;
      color: string;
      size: number;
    }

    const packets: Packet[] = [];
    const packetCount = 45;

    for (let i = 0; i < packetCount; i++) {
      packets.push({
        x: Math.random() * width,
        y: Math.random() * height,
        speed: 0.8 + Math.random() * 2.2,
        length: 20 + Math.random() * 80,
        angle: Math.PI / 6 + (Math.random() * Math.PI) / 8,
        color: i % 2 === 0 ? 'rgba(100, 210, 255, 0.4)' : 'rgba(168, 85, 247, 0.3)',
        size: 1 + Math.random() * 2,
      });
    }

    // Interactive digital architecture particles
    interface InteractiveParticle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      maxAlpha: number;
      color: string;
    }

    const interactiveParticles: InteractiveParticle[] = [];
    const interactiveCount = 65;
    for (let i = 0; i < interactiveCount; i++) {
      interactiveParticles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5 - 0.15,
        size: Math.random() * 2.2 + 0.8,
        alpha: Math.random() * 0.2 + 0.05,
        maxAlpha: Math.random() * 0.35 + 0.15,
        color: i % 2 === 0 ? 'rgba(34, 211, 238, ' : 'rgba(96, 165, 250, ',
      });
    }

    // Real-time mouse coordinate and scroll speed trackers
    let mouseX = -1000;
    let mouseY = -1000;
    let lastScrollY = window.scrollY;
    let scrollVelocity = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    window.addEventListener('mousemove', handleMouseMove);

    const getPanelCenter = (className: string) => {
      const el = document.querySelector(`.${className}`);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    };

    // Grid coordinates
    const gridRows = 16;
    const gridCols = 16;

    const tick = () => {
      ctx.clearRect(0, 0, width, height);

      const currentScrollY = window.scrollY;
      let scrollDiff = currentScrollY - lastScrollY;
      const maxFrameDiff = 8;
      if (scrollDiff > maxFrameDiff) scrollDiff = maxFrameDiff;
      if (scrollDiff < -maxFrameDiff) scrollDiff = -maxFrameDiff;
      lastScrollY = currentScrollY;
      scrollVelocity = scrollVelocity * 0.94 + scrollDiff * 0.06;

      // Update dynamic box-shadow glow and border energy on sci-fi panels based on scroll speed
      const panel1 = document.querySelector('.js-sys-panel-1') as HTMLElement;
      const panel2 = document.querySelector('.js-sys-panel-2') as HTMLElement;
      const panel3 = document.querySelector('.js-sys-panel-3') as HTMLElement;

      const velocityMag = Math.abs(scrollVelocity);
      const intensity = Math.min(velocityMag / 8, 1);

      if (panel1) {
        const glowRadius = 4 + intensity * 24;
        const glowAlpha = 0.05 + intensity * 0.45;
        const borderAlpha = 0.1 + intensity * 0.5;
        panel1.style.boxShadow = `0 4px 30px rgba(3,7,18,0.15), 0 0 ${glowRadius}px rgba(34, 211, 238, ${glowAlpha})`;
        panel1.style.borderColor = `rgba(34, 211, 238, ${borderAlpha})`;
      }
      if (panel2) {
        const glowRadius = 4 + intensity * 24;
        const glowAlpha = 0.05 + intensity * 0.45;
        const borderAlpha = 0.1 + intensity * 0.5;
        panel2.style.boxShadow = `0 4px 30px rgba(3,7,18,0.15), 0 0 ${glowRadius}px rgba(96, 165, 250, ${glowAlpha})`;
        panel2.style.borderColor = `rgba(96, 165, 250, ${borderAlpha})`;
      }
      if (panel3) {
        const glowRadius = 4 + intensity * 24;
        const glowAlpha = 0.05 + intensity * 0.45;
        const borderAlpha = 0.1 + intensity * 0.5;
        panel3.style.boxShadow = `0 4px 30px rgba(3,7,18,0.15), 0 0 ${glowRadius}px rgba(100, 210, 255, ${glowAlpha})`;
        panel3.style.borderColor = `rgba(100, 210, 255, ${borderAlpha})`;
      }

      // PHASE 1: Relational Schema Connector Nodes
      if (scrollProgress <= 0.45) {
        const factor = scrollProgress <= 0.3 ? 1 : (0.45 - scrollProgress) / 0.15;
        ctx.strokeStyle = `rgba(100, 210, 255, ${0.05 * factor})`;
        ctx.lineWidth = 1;

        const spacingX = width / gridCols;
        const spacingY = height / gridRows;

        for (let r = 0; r <= gridRows; r++) {
          for (let c = 0; c <= gridCols; c++) {
            const x = c * spacingX;
            const y = r * spacingY;
            const pulse = Math.sin(Date.now() * 0.001 + r * 0.5 + c * 0.3) * 0.5 + 0.5;
            ctx.fillStyle = `rgba(100, 210, 255, ${0.1 * pulse * factor})`;
            ctx.beginPath();
            ctx.arc(x, y, 1.5 + pulse * 1.5, 0, Math.PI * 2);
            ctx.fill();

            if (c < gridCols && r < gridRows && (r + c) % 5 === 0) {
              ctx.strokeRect(x + 10, y + 10, spacingX - 20, spacingY - 20);
            }
          }
        }
      }

      // PHASE 2: Live Metrics Graph Stream Overlay
      if (scrollProgress > 0.3 && scrollProgress <= 0.8) {
        let factor = 1;
        if (scrollProgress <= 0.45) {
          factor = (scrollProgress - 0.3) / 0.15;
        } else if (scrollProgress > 0.65) {
          factor = (0.8 - scrollProgress) / 0.15;
        }

        ctx.strokeStyle = `rgba(168, 85, 247, ${0.08 * factor})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const cy = height * 0.2 + i * (height * 0.12);
          ctx.moveTo(0, cy);
          ctx.lineTo(width, cy);
        }
        ctx.stroke();

        ctx.strokeStyle = `rgba(100, 210, 255, ${0.25 * factor})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let x = 0; x < width; x += 5) {
          const waveHeight = 60 * Math.sin(x * 0.004 + Date.now() * 0.001) + 
                             30 * Math.cos(x * 0.01 + Date.now() * 0.002);
          const y = height * 0.5 + waveHeight;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.fillStyle = `rgba(100, 210, 255, ${0.04 * factor})`;
        const barWidth = 40;
        const barGap = 30;
        const totalBars = Math.ceil(width / (barWidth + barGap));
        for (let i = 0; i < totalBars; i++) {
          const barHeight2 = Math.abs(Math.sin(i * 0.4 + Date.now() * 0.0008)) * (height * 0.35);
          ctx.fillRect(i * (barWidth + barGap), height - barHeight2 - 50, barWidth, barHeight2);
        }
      }

      // PHASE 3: Heatmap Topographical Wave Grid
      if (scrollProgress > 0.65) {
        const factor = scrollProgress >= 0.8 ? 1 : (scrollProgress - 0.65) / 0.15;
        ctx.strokeStyle = `rgba(6, 182, 212, ${0.12 * factor})`;
        ctx.lineWidth = 1;

        const colSpacing = width / 18;
        const rowSpacing = height / 14;

        for (let r = 0; r < 14; r++) {
          ctx.beginPath();
          for (let c = 0; c < 18; c++) {
            const x = c * colSpacing;
            const distanceToCenter = Math.sqrt(Math.pow(x - width / 2, 2) + Math.pow(r * rowSpacing - height / 2, 2));
            const distortion = Math.sin(distanceToCenter * 0.008 - Date.now() * 0.001) * 35;
            const y = r * rowSpacing + distortion;

            if (c === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);

            if ((r === 4 && c === 6) || (r === 8 && c === 12) || (r === 6 && c === 3)) {
              const spotPulse = Math.sin(Date.now() * 0.002 + r) * 0.5 + 0.5;
              ctx.save();
              ctx.fillStyle = `rgba(239, 68, 68, ${0.07 * spotPulse * factor})`;
              ctx.beginPath();
              ctx.arc(x, y, 40 + spotPulse * 80, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
            }
          }
          ctx.stroke();
        }
      }

      // Render standard floating data flows
      packets.forEach((p) => {
        const scrollOffsetEffect = scrollVelocity * 0.015;
        p.x += Math.cos(p.angle) * p.speed;
        p.y += Math.sin(p.angle) * p.speed - scrollOffsetEffect;

        if (p.x > width + 100 || p.y > height + 100) {
          p.x = -50;
          p.y = Math.random() * height;
        } else if (p.y < -100) {
          p.y = height + 50;
          p.x = Math.random() * width;
        }

        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - Math.cos(p.angle) * p.length, p.y - Math.sin(p.angle) * p.length);
        ctx.stroke();

        ctx.fillStyle = p.color.replace('0.3', '0.8').replace('0.4', '0.9');
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 1.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Render interactive particles
      interactiveParticles.forEach((part) => {
        const scrollOffsetEffect = scrollVelocity * 0.008;
        const dx = mouseX - part.x;
        const dy = mouseY - part.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);

        let forceX = 0;
        let forceY = 0;

        if (dist < 180 && dist > 1) {
          const strength = (180 - dist) / 180;
          forceX = (dx / dist) * strength * 0.8;
          forceY = (dy / dist) * strength * 0.8;
          part.alpha = Math.min(part.maxAlpha * 1.8, part.alpha * 0.88 + strength * 0.4);
        } else {
          part.alpha = part.alpha * 0.95 + part.maxAlpha * 0.05;
        }

        part.x += part.vx + forceX;
        part.y += part.vy + forceY - scrollOffsetEffect;

        if (part.x < -20) part.x = width + 20;
        if (part.x > width + 20) part.x = -20;
        if (part.y < -20) part.y = height + 20;
        if (part.y > height + 20) part.y = -20;

        ctx.fillStyle = `${part.color}${part.alpha})`;
        ctx.beginPath();
        ctx.arc(part.x, part.y, part.size, 0, Math.PI * 2);
        ctx.fill();

        if (dist < 120 && dist > 5) {
          const connectorAlpha = (1 - dist / 120) * 0.12 * part.alpha;
          ctx.strokeStyle = `rgba(34, 211, 238, ${connectorAlpha})`;
          ctx.lineWidth = 0.55;
          ctx.beginPath();
          ctx.moveTo(part.x, part.y);
          ctx.lineTo(mouseX, mouseY);
          ctx.stroke();
        }
      });

      // Tether lines between floating UI panels and nearest data nodes
      const panelConfigs = [
        { className: 'js-sys-panel-1', color: 'rgba(34, 211, 238, ' },
        { className: 'js-sys-panel-2', color: 'rgba(96, 165, 250, ' },
        { className: 'js-sys-panel-3', color: 'rgba(100, 210, 255, ' },
      ];

      panelConfigs.forEach((pc) => {
        const center = getPanelCenter(pc.className);
        if (!center) return;

        const dx = mouseX - center.x;
        const dy = mouseY - center.y;
        const distToMouse = Math.sqrt(dx * dx + dy * dy);

        const maxTetherRadius = 320;
        if (distToMouse < maxTetherRadius) {
          const tetherIntensity = Math.pow(1 - distToMouse / maxTetherRadius, 1.5);

          const nearestParticles = [...interactiveParticles]
            .map((part) => {
              const pdx = part.x - center.x;
              const pdy = part.y - center.y;
              return { part, distSq: pdx * pdx + pdy * pdy };
            })
            .sort((a, b) => a.distSq - b.distSq)
            .slice(0, 3);

          nearestParticles.forEach(({ part }) => {
            const alpha = tetherIntensity * 0.22;
            ctx.strokeStyle = `${pc.color}${alpha})`;
            ctx.lineWidth = 0.65;
            ctx.setLineDash([4, 4]);
            ctx.lineDashOffset = -Date.now() * 0.04;
            ctx.beginPath();
            ctx.moveTo(center.x, center.y);
            ctx.lineTo(part.x, part.y);
            ctx.stroke();
            ctx.setLineDash([]);

            const progress = (Date.now() * 0.001) % 1.0;
            const px = center.x + (part.x - center.x) * progress;
            const py = center.y + (part.y - center.y) * progress;
            ctx.fillStyle = `${pc.color}${tetherIntensity * 0.85})`;
            ctx.beginPath();
            ctx.arc(px, py, 2.0, 0, Math.PI * 2);
            ctx.fill();
          });

          ctx.strokeStyle = `${pc.color}${tetherIntensity * 0.06})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(center.x, center.y, 45 + tetherIntensity * 25, 0, Math.PI * 2);
          ctx.stroke();
        }
      });

      animationRef.current = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [scrollProgress]);

  return (
    <div
      id="bgWrap"
      className="fixed top-0 left-0 w-full h-full z-0 overflow-hidden select-none pointer-events-none"
      style={{ backgroundColor: '#060910' }}
    >
      {/* Glowing Background Blobs and Accents */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-cyan-900/10 blur-[120px] mix-blend-screen animate-pulse duration-10000" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] rounded-full bg-blue-900/10 blur-[150px] mix-blend-screen animate-pulse duration-8000" />
        
        {/* Data Stream Lines overlay */}
        <div className="absolute inset-0 opacity-25">
          <div className="absolute top-1/4 left-0 w-full h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
          <div className="absolute top-2/3 left-0 w-full h-[1.5px] bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
          <div className="absolute top-0 left-1/3 w-[1.5px] h-full bg-gradient-to-b from-transparent via-cyan-400/40 to-transparent" />
        </div>

        {/* Abstract Glowing Nodes */}
        <div className="absolute inset-0">
          <div className="absolute top-[20%] left-[30%] w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.8)]" />
          <div className="absolute top-[60%] left-[45%] w-3 h-3 rounded-full bg-blue-400 shadow-[0_0_20px_rgba(96,165,250,0.8)]" />
          <div className="absolute top-[40%] left-[70%] w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_15px_rgba(100,210,255,0.8)]" />
        </div>
      </div>

      {/* ─── Scroll-Driven Background Images: Zoom + Fade ─── */}
      <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
        {/* Image 1: SQL (visible at scroll 0% → fades out by ~35%) */}
        <div
          className="absolute inset-0 transition-[opacity,transform] duration-100 will-change-[opacity,transform]"
          style={{
            opacity: Math.max(0, 1 - scrollProgress * 2.8),
            transform: `scale(${1 + scrollProgress * 0.25})`,
          }}
        >
          <img
            src="/hero/datamind_sql_bg.webp"
            alt="SQL Database Background"
            className="w-full h-full object-cover"
            loading="eager"
          />
          {/* Dark overlay for readability */}
          <div className="absolute inset-0 bg-[#060910]/60" />
        </div>

        {/* Image 2: Charts (fades in at ~30%, full at 50%, fades out by ~70%) */}
        <div
          className="absolute inset-0 transition-[opacity,transform] duration-100 will-change-[opacity,transform]"
          style={{
            opacity: scrollProgress <= 0.3
              ? 0
              : scrollProgress <= 0.5
                ? (scrollProgress - 0.3) / 0.2
                : scrollProgress <= 0.7
                  ? 1
                  : Math.max(0, 1 - (scrollProgress - 0.7) / 0.15),
            transform: `scale(${1.05 + (scrollProgress - 0.3) * 0.3})`,
          }}
        >
          <img
            src="/hero/datamind_charts_bg.png"
            alt="Data Charts Background"
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-[#060910]/60" />
        </div>

        {/* Image 3: Heatmap (fades in at ~65%, full at 85%+) */}
        <div
          className="absolute inset-0 transition-[opacity,transform] duration-100 will-change-[opacity,transform]"
          style={{
            opacity: scrollProgress <= 0.65
              ? 0
              : Math.min(1, (scrollProgress - 0.65) / 0.2),
            transform: `scale(${1.05 + (scrollProgress - 0.65) * 0.35})`,
          }}
        >
          <img
            src="/hero/datamind_heatmap_bg.png"
            alt="Heatmap Background"
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-[#060910]/55" />
        </div>
      </div>

      {/* Subtle vignette layer */}
      <div className="absolute inset-0 w-full h-full pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(6,9,16,0.1)_0%,rgba(6,9,16,0.85)_100%)] z-[2]" />

      {/* Canvas for dynamic effects */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-[3]" />

      {/* Panel 1: Core System Monitor Panel */}
      <div className="js-sys-panel-1 absolute left-[3%] top-[34%] z-20 pointer-events-none select-none animate-sys-float-1 hidden xl:flex flex-col w-56 rounded-xl border border-cyan-500/10 bg-[#060910]/20 backdrop-blur-[1px] p-3.5 font-mono text-[9px] text-cyan-400/30 shadow-[0_4px_30px_rgba(3,7,18,0.15)]">
        <div className="absolute -top-[1px] -left-[1px] w-1.5 h-1.5 border-t border-l border-cyan-400/40" />
        <div className="absolute -top-[1px] -right-[1px] w-1.5 h-1.5 border-t border-r border-cyan-400/40" />
        <div className="absolute -bottom-[1px] -left-[1px] w-1.5 h-1.5 border-b border-l border-cyan-400/40" />
        <div className="absolute -bottom-[1px] -right-[1px] w-1.5 h-1.5 border-b border-r border-cyan-400/40" />
        <div className="flex items-center justify-between border-b border-cyan-500/10 pb-2 mb-2 text-cyan-300/40">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-1 h-1 rounded-full bg-cyan-400/40 animate-pulse" />
            <span className="font-bold tracking-wider">CORE_SYS: TELEMETRY</span>
          </div>
          <span>SECURE_CHNL</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-slate-500/50">
            <span>PROCESSOR_ID</span>
            <span className="text-cyan-400/30 font-semibold text-[8px]">DATAMIND.CORE.V89</span>
          </div>
          <div className="flex justify-between items-center text-slate-500/50">
            <span>SCHEMA_MAPS</span>
            <span className="text-cyan-400/30">4,092 // STABLE</span>
          </div>
          <div className="flex justify-between items-center text-slate-500/50">
            <span>LATENCY</span>
            <span className="text-cyan-400/35">{(0.05 + Math.abs(Math.sin(scrollY / 160)) * 0.04).toFixed(3)} ms</span>
          </div>
          <div className="flex justify-between items-center text-slate-500/50">
            <span>BUFFER_PT</span>
            <span className="text-cyan-400/30 font-semibold">0x{(Math.floor(scrollY / 15) % 65536).toString(16).toUpperCase().padStart(4, '0')}</span>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-8 gap-0.5 border-t border-cyan-500/5 pt-2">
          {Array.from({ length: 16 }).map((_, i) => (
            <span
              key={i}
              className={`h-1 rounded-sm transition-all duration-300 ${
                (i + Math.floor(scrollY / 150)) % 4 === 0
                  ? 'bg-cyan-500/30 shadow-[0_0_3px_rgba(34,211,238,0.4)]'
                  : 'bg-cyan-950/10'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Panel 2: Vector Path Tracker Panel */}
      <div className="js-sys-panel-2 absolute right-[3%] top-[58%] z-20 pointer-events-none select-none animate-sys-float-2 hidden lg:flex flex-col w-48 rounded-xl border border-cyan-500/10 bg-[#060910]/20 backdrop-blur-[1px] p-3.5 font-mono text-[9px] text-cyan-400/30 shadow-[0_4px_30px_rgba(3,7,18,0.15)]">
        <div className="absolute -top-[1px] -left-[1px] w-1.5 h-1.5 border-t border-l border-cyan-400/40" />
        <div className="absolute -top-[1px] -right-[1px] w-1.5 h-1.5 border-t border-r border-cyan-400/40" />
        <div className="absolute -bottom-[1px] -left-[1px] w-1.5 h-1.5 border-b border-l border-cyan-400/40" />
        <div className="absolute -bottom-[1px] -right-[1px] w-1.5 h-1.5 border-b border-r border-cyan-400/40" />
        <div className="flex items-center justify-between border-b border-cyan-500/10 pb-2 mb-2 text-cyan-300/40">
          <span className="font-bold tracking-wider">[ RESOLVER_COORDS ]</span>
          <span className="text-slate-500/40">SYS_V</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-slate-500/50">
            <span>AXIS_VALS</span>
            <span className="text-cyan-400/30">{(scrollY / 1000).toFixed(3)} : {scrollProgress.toFixed(3)}</span>
          </div>
          <div className="flex justify-between items-center text-slate-500/50">
            <span>QUOTA_CAP</span>
            <span className="text-cyan-400/30">{(99.98 - Math.abs(Math.sin(scrollY / 1200)) * 0.04).toFixed(2)}%</span>
          </div>
          <div className="flex justify-between items-center text-slate-500/50">
            <span>INDEX_PTR</span>
            <span className="text-cyan-400/30 font-semibold">#{Math.floor(scrollY * 1.05 + 83451)}</span>
          </div>
        </div>
        <div className="mt-2 text-[#64d2ff]/25 text-center font-bold text-[7.5px] tracking-[0.25em] uppercase">
          {scrollY > 50 ? 'MATRIX_SCROLL_STREAM' : 'MATRIX_IDLE_SYNC'}
        </div>
      </div>

      {/* Panel 3: Global Synchronizer Ledger */}
      <div className="js-sys-panel-3 absolute right-[8%] top-[12%] z-20 pointer-events-none select-none animate-sys-float-3 hidden 2xl:flex flex-col w-52 rounded-xl border border-cyan-500/10 bg-[#060910]/20 backdrop-blur-[1px] p-3.5 font-mono text-[9px] text-[#64d2ff]/30 shadow-[0_4px_30px_rgba(3,7,18,0.15)]">
        <div className="absolute -top-[1px] -left-[1px] w-1.5 h-1.5 border-t border-l border-cyan-400/40" />
        <div className="absolute -top-[1px] -right-[1px] w-1.5 h-1.5 border-t border-r border-cyan-400/40" />
        <div className="absolute -bottom-[1px] -left-[1px] w-1.5 h-1.5 border-b border-l border-cyan-400/40" />
        <div className="absolute -bottom-[1px] -right-[1px] w-1.5 h-1.5 border-b border-r border-cyan-400/40" />
        <div className="flex items-center justify-between border-b border-[rgba(100,210,255,0.1)] pb-2 mb-2 text-cyan-300/40">
          <span className="font-bold tracking-wider">&#9650; HOST_CLUSTER_02</span>
          <span className="text-[#64d2ff]/40">TX_RATE</span>
        </div>
        <div className="flex flex-col gap-1.5 text-[8.5px]">
          <div className="flex justify-between items-center text-slate-500/50">
            <span>THREAD_ID</span>
            <span className="text-[#64d2ff]/30 font-medium">CY_A_0xFF71</span>
          </div>
          <div className="flex justify-between items-center text-slate-500/50">
            <span>DB_REPLICA</span>
            <span className="text-cyan-400/30">ONLINE</span>
          </div>
          <div className="flex justify-between items-center text-slate-500/50">
            <span>SEED_HASH</span>
            <span className="text-purple-400/30 font-semibold">0x{(38421 + Math.floor(scrollY / 18)).toString(16).toUpperCase()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
