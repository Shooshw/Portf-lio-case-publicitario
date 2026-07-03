import { useState, useEffect, useRef } from "react";
import { Globe, Sun, Moon, Volume2, VolumeX } from "lucide-react";
import { playClickSound, playChimeSound } from "./AudioEngine";

interface UIOverlayProps {
  isDarkMode: boolean;
  onToggleTheme: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export default function UIOverlay({ isDarkMode, onToggleTheme, soundEnabled, onToggleSound }: UIOverlayProps) {
  const [timeStr, setTimeStr] = useState("");
  const mouseCoordsRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const offsetMinutes = now.getTimezoneOffset();
      const offsetHours = -offsetMinutes / 60;
      const gmtSign = offsetHours >= 0 ? "+" : "";
      const gmtStr = `GMT${gmtSign}${offsetHours}`;
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      
      let localeCode = "CN";
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (tz.includes("America/Sao_Paulo") || tz.includes("Brazil")) {
          localeCode = "BR";
        } else if (tz.includes("America/New_York")) {
          localeCode = "NY";
        } else if (tz.includes("Europe/London")) {
          localeCode = "LDN";
        }
      } catch (e) {}
      setTimeStr(`${gmtStr} ${localeCode} ${hh}:${mm} 22°C`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Telemetria do mouse global em tempo real no rodapé [cite: 8, 12]
  useEffect(() => {
    const handleMouseMoveGlobal = (e: MouseEvent) => {
      if (mouseCoordsRef.current) {
        const padX = String(Math.round(e.clientX)).padStart(4, "0");
        const padY = String(Math.round(e.clientY)).padStart(4, "0");
        mouseCoordsRef.current.textContent = `${padX} X ${padY} Y`;
      }
    };
    window.addEventListener("mousemove", handleMouseMoveGlobal);
    return () => window.removeEventListener("mousemove", handleMouseMoveGlobal);
  }, []);

  const handleInteraction = (action: () => void) => {
    if (soundEnabled) playClickSound();
    action();
  };

  return (
    <>
      {/* HUD: Grade de linhas cruzadas de precisão [cite: 8] */}
      <div className="fixed inset-0 pointer-events-none z-[3]">
        <div className="absolute inset-y-0 left-[25%] border-r border-stone-400/[0.04] dark:border-stone-100/[0.03]" />
        <div className="absolute inset-y-0 left-[50%] border-r border-stone-400/[0.04] dark:border-stone-100/[0.03]" />
        <div className="absolute inset-y-0 left-[75%] border-r border-stone-400/[0.04] dark:border-stone-100/[0.03]" />
        <div className="absolute inset-x-0 top-[35%] border-b border-stone-400/[0.04] dark:border-stone-100/[0.03]" />
        <div className="absolute inset-x-0 top-[70%] border-b border-stone-400/[0.04] dark:border-stone-100/[0.03]" />

        {/* Marcadores de Cruzamento de Coordenadas (+) [cite: 8] */}
        <span className="absolute top-[35%] left-[25%] -translate-x-1/2 -translate-y-1/2 font-mono text-[8px] opacity-35 select-none">+</span>
        <span className="absolute top-[35%] left-[50%] -translate-x-1/2 -translate-y-1/2 font-mono text-[8px] opacity-35 select-none">+</span>
        <span className="absolute top-[35%] left-[75%] -translate-x-1/2 -translate-y-1/2 font-mono text-[8px] opacity-35 select-none">+</span>
        <span className="absolute top-[70%] left-[25%] -translate-x-1/2 -translate-y-1/2 font-mono text-[8px] opacity-35 select-none">+</span>
        <span className="absolute top-[70%] left-[50%] -translate-x-1/2 -translate-y-1/2 font-mono text-[8px] opacity-35 select-none">+</span>
        <span className="absolute top-[70%] left-[75%] -translate-x-1/2 -translate-y-1/2 font-mono text-xs opacity-20 text-stone-400 dark:text-stone-500 pointer-events-none">[BLUEPRINT SYSTEM // MODEL-S]</span>
      </div>

      {/* HEADER FIXO */}
      <header className="fixed top-0 inset-x-0 z-[4] flex justify-between items-center p-6 md:p-8 select-none pointer-events-none">
        <div className="font-mono text-[11px] leading-relaxed text-left pointer-events-auto">
          <p className="font-bold text-xs uppercase tracking-widest text-stone-900 dark:text-white">ÁREAS DE ATUAÇÃO</p>
          <p className="font-medium text-stone-500 dark:text-stone-400">Publicidade, Marketing & Comunicação</p>
        </div>

        <nav className="flex items-center gap-4 font-mono text-[11px] tracking-wider pointer-events-auto">
          <a href="#trabalho" className="relative py-1 group font-bold text-stone-900 dark:text-white hover:opacity-80 transition-all duration-300">
            PORTFÓLIO
            <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-stone-900 dark:bg-white group-hover:w-full transition-all duration-300" />
          </a>
          <a href="mailto:historicotempo@gmail.com" className="relative py-1 group font-bold text-stone-900 dark:text-white hover:opacity-80 transition-all duration-300">
            CONTATO
            <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-stone-900 dark:bg-white group-hover:w-full transition-all duration-300" />
          </a>
          
          <button onClick={() => handleInteraction(onToggleTheme)} className="flex items-center gap-1 py-1 font-bold text-stone-900 dark:text-white cursor-pointer" title="Alternar Tema">
            {isDarkMode ? (
              <span className="flex items-center gap-0.5">PAPEL <span className="text-stone-400 font-black">[SÉPIA]</span> <Moon size={11} className="inline ml-0.5" /></span>
            ) : (
              <span className="flex items-center gap-0.5">PAPEL <span className="text-stone-800 font-black">[MARFIM]</span> <Sun size={11} className="inline ml-0.5" /></span>
            )}
          </button>

          <button onClick={onToggleSound} className="flex items-center gap-1 py-1 font-bold text-stone-900 dark:text-white cursor-pointer" title="Alternar Som">
            {soundEnabled ? (
              <span className="flex items-center gap-0.5">SOM <span className="text-emerald-600 dark:text-emerald-400 font-black">[•]</span> <Volume2 size={11} className="inline ml-0.5" /></span>
            ) : (
              <span className="flex items-center gap-0.5">SOM <span className="text-stone-500 font-black">[ ]</span> <VolumeX size={11} className="inline ml-0.5" /></span>
            )}
          </button>
        </nav>
      </header>

      {/* FOOTER FIXO */}
      <footer className="fixed bottom-0 inset-x-0 z-[4] flex justify-between items-center p-6 md:p-8 font-mono text-[10px] text-stone-400 dark:text-stone-500 select-none pointer-events-none">
        <div className="justify-self-start pointer-events-auto">PORTFÓLIO DE CASES • ©2026</div>
        
        <div className="justify-self-center font-bold tracking-widest text-stone-900 dark:text-white pointer-events-auto">
          <span ref={mouseCoordsRef}>0000 X 0000 Y</span>
        </div>
        
        <div className="justify-self-end flex items-center gap-2 pointer-events-auto">
          <span>{timeStr}</span>
          <Globe size={11} className="inline text-stone-500 animate-spin-slow cursor-pointer" onClick={() => { if (soundEnabled) playChimeSound(); }} />
        </div>
      </footer>
    </>
  );
}