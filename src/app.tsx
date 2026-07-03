import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
gsap.registerPlugin(ScrollTrigger);

import WaterRippleBackground from "./components/WaterRippleBackground";
import UIOverlay from "./components/UIOverlay";
import FloatingStickers from "./components/FloatingStickers";
import { playClickSound, playPopSound } from "./components/AudioEngine";

const PROJECTS = [
  { title: "SISTEMAS FLUIDOS", category: "Identidade Visual & Marketing", year: "2026", desc: "Identidade tipográfica adaptativa e direção de arte para campanha digital baseada em designs suíços clássicos e distorções líquidas interativas.", img: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=800&q=80" },
  { title: "CAMPANHA VOLTAICO", category: "Publicidade & Direção de Arte", year: "2025", desc: "Direção de arte integrada combinando fotografia analógica com tipografia pesada neo-grotesca, projetada para forte presença de marca em canais digitais.", img: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80" },
  { title: "CONCEITO ESTRUTURADO", category: "Design Editorial & Web3", year: "2025", desc: "Projeto editorial focado em sistemas de grid hiper-rígidos para publicações digitais, unindo máxima legibilidade com composições experimentais assimétricas.", img: "https://images.unsplash.com/photo-1604871000636-074fa5117945?auto=format&fit=crop&w=800&q=80" },
  { title: "ARQUITETURA DE MARCA", category: "Comunicação Digital", year: "2024", desc: "Linguagem visual sistêmica baseada em formas geométricas puras, tipografia mono-espaçada e cores primárias de alto contraste para estúdio de design.", img: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=800&q=80" }
];

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const lenisRef = useRef<Lenis | null>(null);

  // Refs de Imagens Flutuantes inspiradas no Haoqi [cite: 18]
  const hoverImageRef = useRef<HTMLDivElement>(null);
  const hoverImgElRef = useRef<HTMLImageElement>(null);
  const xToRef = useRef<any>(null);
  const yToRef = useRef<any>(null);

  const backdropArtRef = useRef<HTMLDivElement>(null);
  const heroContainerRef = useRef<HTMLDivElement>(null);
  const mouseNormRef = useRef({ x: 0, y: 0 });

  // 1. Inicializa o Lenis Smooth Scroll [cite: 16]
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    lenisRef.current = lenis;

    lenis.on("scroll", () => ScrollTrigger.update());

    const updateLenis = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(updateLenis);
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.destroy();
      gsap.ticker.remove(updateLenis);
    };
  }, []);

  // 2. Registra o GSAP QuickTo para mover a imagem de preview flutuante suavemente [cite: 12, 18]
  useEffect(() => {
    if (!hoverImageRef.current) return;
    xToRef.current = gsap.quickTo(hoverImageRef.current, "x", { duration: 0.35, ease: "power3.out" });
    yToRef.current = gsap.quickTo(hoverImageRef.current, "y", { duration: 0.35, ease: "power3.out" });
  }, []);

  // Ouve o mouse global para inclinação 3D da arte de vidro "Olá"
  useEffect(() => {
    const handleMouseMoveGlobal = (e: MouseEvent) => {
      mouseNormRef.current = { 
        x: (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2), 
        y: (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2) 
      };
    };
    window.addEventListener("mousemove", handleMouseMoveGlobal);
    return () => window.removeEventListener("mousemove", handleMouseMoveGlobal);
  }, []);

  // 3. Efeito 3D sutil na imagem do Olá e reflexos na rolagem
  useEffect(() => {
    let targetScrollTop = 0;
    let currentScrollTop = 0;
    let targetTiltX = 0; let targetTiltY = 0;
    let currentTiltX = 0; let currentTiltY = 0;
    let rafId: number;

    const handleScroll = () => {
      targetScrollTop = window.scrollY || document.documentElement.scrollTop;
    };

    const updateRotationAndTilt = () => {
      currentScrollTop += (targetScrollTop - currentScrollTop) * 0.08;
      
      const normX = mouseNormRef.current.x;
      const normY = mouseNormRef.current.y;
      
      targetTiltX = -normY * 15;
      targetTiltY = normX * 15;
      currentTiltX += (targetTiltX - currentTiltX) * 0.08;
      currentTiltY += (targetTiltY - currentTiltY) * 0.08;

      const backdropEl = backdropArtRef.current;
      if (backdropEl) {
        backdropEl.style.transform = `perspective(1800px) rotateX(${currentTiltX}deg) rotateY(${currentTiltY}deg) scale(1.02)`;
        const imgEl = backdropEl.querySelector("img");
        if (imgEl) {
          const rotation = (currentScrollTop * 0.12) % 360;
          imgEl.style.transform = `translateZ(30px) rotateX(${rotation}deg)`;
        }
      }
      rafId = requestAnimationFrame(updateRotationAndTilt);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    rafId = requestAnimationFrame(updateRotationAndTilt);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);

  // GSAP ScrollTrigger para encolher a Hero Section ao rolar a tela
  useEffect(() => {
    const el = heroContainerRef.current;
    if (!el) return;
    const anim = gsap.fromTo(el, { scale: 1, opacity: 1 }, {
      scale: 0.75, opacity: 0.25, ease: "power1.out",
      scrollTrigger: { trigger: "body", start: "top top", end: "45% top", scrub: 1 }
    });
    return () => {
      anim.kill();
    };
  }, []);

  // 4. Hover handlers para a Tabela de Projetos [cite: 18]
  const handleProjectMouseEnter = (e: React.MouseEvent, imgUrl: string) => {
    if (!hoverImgElRef.current || !hoverImageRef.current) return;
    hoverImgElRef.current.src = imgUrl;
    
    gsap.killTweensOf(hoverImageRef.current);
    gsap.set(hoverImageRef.current, { x: e.clientX + 15, y: e.clientY + 15 });
    
    gsap.to(hoverImageRef.current, {
      opacity: 1,
      scale: 1,
      duration: 0.4,
      ease: "power2.out"
    });
    if (soundEnabled) playClickSound();
  };

  const handleProjectMouseMove = (e: React.MouseEvent) => {
    if (xToRef.current && yToRef.current) {
      xToRef.current(e.clientX + 15);
      yToRef.current(e.clientY + 15);
    }
  };

  const handleProjectMouseLeave = () => {
    if (!hoverImageRef.current) return;
    gsap.killTweensOf(hoverImageRef.current);
    gsap.to(hoverImageRef.current, {
      opacity: 0,
      scale: 0.85,
      duration: 0.3,
      ease: "power2.out"
    });
  };

  return (
    <div className={`relative w-full min-h-screen ${isDarkMode ? "dark" : ""}`}>
      {/* Shader WebGL de Água e Grade Suíça no Fundo [cite: 8, 10, 62] */}
      <WaterRippleBackground isDarkMode={isDarkMode} />

      {/* Camada HUD Fixo (Coordenadas, Relógio e Menu) [cite: 8, 12] */}
      <UIOverlay
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
      />

      {/* Stickers Magnéticos decorativos [cite: 11] */}
      <FloatingStickers />

      {/* CONTEÚDO SCROLLABLE */}
      <div className="relative z-[5] w-full px-6 md:p-8 pt-36 pb-24 font-mono select-none">
        
        {/* ==================== HERO SECTION ==================== */}
        <section className="min-h-[85vh] flex flex-col justify-end items-start relative pointer-events-none">
          
          {/* Arte Cromada Centralizada "Olá" */}
          <div ref={heroContainerRef} className="absolute inset-0 flex justify-center items-center pointer-events-none z-[1]" style={{ perspective: "1500px", transformStyle: "preserve-3d" }}>
            <div ref={backdropArtRef} className="w-full max-w-[700px] md:max-w-[1000px] lg:max-w-[1200px] aspect-[16/9] px-4 flex justify-center items-center transition-all duration-300 relative select-none" style={{ transformStyle: "preserve-3d" }}>
              <img 
                src="/src/assets/images/regenerated_image_1782354215634.png" 
                onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80"; }} 
                alt="Olá Glass Artwork" 
                className="w-full h-full object-contain select-none" 
                style={{ transform: "translateZ(30px)", filter: "drop-shadow(0 25px 45px rgba(0,0,0,0.15))" }}
                referrerPolicy="no-referrer" 
              />
            </div>
          </div>

          {/* Tipografia de Contorno Elegante (Sem Caixas Amarelas) */}
          <div className="relative flex flex-col text-left max-w-5xl w-full select-none pb-12 z-[3]">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="py-1">
              <h1 className="font-display font-black tracking-tighter uppercase text-4xl sm:text-6xl md:text-7xl lg:text-8xl leading-none text-stone-900 dark:text-white">
                EU TRAGO
              </h1>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.15 }} className="py-2">
              <h1 className="font-display font-black tracking-tighter uppercase text-4xl sm:text-6xl md:text-7xl lg:text-8xl leading-none text-stone-900 dark:text-white flex flex-wrap items-center justify-start gap-y-2">
                <span className="relative inline-block px-4 py-1 rounded border border-stone-400/20 bg-stone-400/[0.04] dark:bg-white/[0.02] backdrop-blur-sm pointer-events-auto cursor-pointer hover:scale-105 transition-all duration-300" onClick={() => { if (soundEnabled) playPopSound(); }}>
                  CAPRICHO
                </span>
                <span className="mx-3 text-stone-400 dark:text-stone-600">&</span>
                <span className="relative inline-block px-4 py-1 rounded border border-stone-400/20 bg-stone-400/[0.04] dark:bg-white/[0.02] backdrop-blur-sm pointer-events-auto cursor-pointer hover:scale-105 transition-all duration-300" onClick={() => { if (soundEnabled) playPopSound(); }}>
                  BOM GOSTO
                </span>
              </h1>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }} className="py-1">
              <h1 className="font-display font-black tracking-tighter uppercase text-4xl sm:text-6xl md:text-7xl lg:text-8xl leading-none text-stone-900 dark:text-white flex flex-wrap items-center justify-start gap-y-2">
                <span>À COMUNICAÇÃO E</span>
                <span className="relative inline-block px-3 py-0.5 rounded border border-stone-400/20 bg-stone-400/[0.04] dark:bg-white/[0.02] backdrop-blur-sm pointer-events-auto cursor-pointer hover:scale-105 transition-all duration-300 ml-2 text-stone-900 dark:text-white" onClick={() => { if (soundEnabled) playPopSound(); }}>
                  PUBLICIDADE
                </span>
              </h1>
            </motion.div>
          </div>
        </section>

        {/* ==================== MANIFESTO SECTION ==================== */}
        <section id="manifesto" className="min-h-[60vh] py-24 flex flex-col justify-center items-start max-w-4xl text-left">
          <p className="font-mono text-xs uppercase tracking-[0.2em] mb-4 text-stone-400 dark:text-stone-500">MANIFESTO</p>
          <p className="font-display font-bold text-2xl sm:text-3xl md:text-4xl lg:text-5xl tracking-tight leading-snug text-stone-900 dark:text-stone-200">
            Acredito que cada pixel conta uma história. O bom design não é apenas visual; é uma experiência sensorial de harmonia, ritmo e capricho. Unindo refinamento estético contemporâneo e interações analógicas para criar soluções de comunicação memoráveis e autênticas.
          </p>
        </section>

        {/* ==================== PORTFOLIO TABLE (HAOQI ARCHETYPE) ==================== */}
        <section id="trabalho" className="py-24 border-t border-stone-400/10">
          <div className="w-full flex justify-between items-baseline mb-12">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-stone-400 dark:text-stone-500">PROJETOS SELECIONADOS</p>
            <span className="font-mono text-[10px] text-stone-400 dark:text-stone-500">({PROJECTS.length}) CASES</span>
          </div>

          <div className="w-full border-t border-stone-200 dark:border-stone-800">
            {PROJECTS.map((project, i) => {
              const numStr = String(i + 1).padStart(2, "0");
              return (
                <div
                  key={i}
                  className="grid grid-cols-12 gap-4 py-8 border-b border-stone-200 dark:border-stone-800 cursor-pointer group hover:bg-stone-400/[0.01] transition-colors duration-300"
                  onMouseEnter={(e) => handleProjectMouseEnter(e, project.img)}
                  onMouseMove={handleProjectMouseMove}
                  onMouseLeave={handleProjectMouseLeave}
                  onClick={() => { if (soundEnabled) playPopSound(); }}
                >
                  <span className="col-span-1 font-mono text-xs text-stone-400 dark:text-stone-500 self-center">
                    {numStr}
                  </span>
                  <h2 className="col-span-11 md:col-span-5 font-sans font-bold text-xl md:text-2xl uppercase group-hover:translate-x-2 transition-transform duration-300 text-stone-900 dark:text-stone-100 self-center">
                    {project.title}
                  </h2>
                  <span className="col-span-8 md:col-span-4 font-mono text-xs uppercase text-stone-400 dark:text-stone-500 self-center">
                    {project.category}
                  </span>
                  <span className="col-span-4 md:col-span-2 text-right font-mono text-xs text-stone-400 dark:text-stone-500 self-center">
                    [{project.year}]
                  </span>
                </div>
              );
            })}
          </div>
        </section>

      </div>

      {/* PREVIEW FLUTUANTE DE IMAGENS [cite: 18] */}
      <div
        ref={hoverImageRef}
        className="fixed pointer-events-none z-50 w-[300px] h-[190px] rounded-lg overflow-hidden opacity-0 scale-[0.8] shadow-2xl transition-all duration-300 ease-out"
        style={{ top: 0, left: 0, willChange: "transform, opacity, scale" }}
      >
        <img
          ref={hoverImgElRef}
          src=""
          className="w-full h-full object-cover"
          alt="Preview do Caso de Publicidade"
        />
      </div>
    </div>
  );
}