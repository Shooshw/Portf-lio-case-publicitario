/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);
import { 
  Globe, 
  Volume2, 
  VolumeX, 
  Sun, 
  Moon, 
  MousePointer, 
  Edit3, 
  Sparkles,
  Check,
  X
} from "lucide-react";
import CanvasGrid from "./components/CanvasGrid";
import { playClickSound, playPopSound, playChimeSound } from "./components/AudioEngine";
import ShaderImage from "./components/ShaderImage";
import { ShapeOverlays } from "./components/ShapeOverlays";

const PROJECTS = [
  {
    title: "SISTEMAS FLUIDOS",
    category: "Identidade Visual & Marketing",
    year: "2026",
    desc: "Identidade tipográfica adaptativa e direção de arte para campanha digital baseada em designs suíços clássicos e distorções líquidas interativas.",
    img: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=800&q=80"
  },
  {
    title: "CAMPANHA VOLTAICO",
    category: "Publicidade & Direção de Arte",
    year: "2025",
    desc: "Direção de arte integrada combinando fotografia analógica com tipografia pesada neo-grotesca, projetada para forte presença de marca em canais digitais.",
    img: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80"
  },
  {
    title: "CONCEITO ESTRUTURADO",
    category: "Design Editorial & Web3",
    year: "2025",
    desc: "Projeto editorial focado em sistemas de grid hiper-rígidos para publicações digitais, unindo máxima legibilidade com composições experimentais assimétricas.",
    img: "https://images.unsplash.com/photo-1604871000636-074fa5117945?auto=format&fit=crop&w=800&q=80"
  },
  {
    title: "ARQUITETURA DE MARCA",
    category: "Comunicação Digital",
    year: "2024",
    desc: "Linguagem visual sistêmica baseada em formas geométricas puras, tipografia mono-espaçada e cores primárias de alto contraste para estúdio de design.",
    img: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=800&q=80"
  }
];

interface SplitTextProps {
  text: string;
  className?: string;
}

function SplitText({ text, className = "" }: SplitTextProps) {
  const words = text.split(" ");
  return (
    <span className={`inline-block split-text-container ${className}`}>
      {words.map((word, wIdx) => (
        <span key={wIdx} className="inline-block whitespace-nowrap mr-[0.25em] overflow-hidden leading-normal align-bottom">
          {word.split("").map((char, cIdx) => (
            <span
              key={cIdx}
              className="inline-block split-char"
              style={{ willChange: "transform, opacity" }}
            >
              {char}
            </span>
          ))}
        </span>
      ))}
    </span>
  );
}

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [gridMode, setGridMode] = useState<"full" | "lines" | "off">("lines");
  
  // Ref for custom SVG shape overlay transitions
  const overlaysRef = useRef<any>(null);
  const [currentView, setCurrentView] = useState<"hero" | "portfolio">("hero");
  const isTransitioningRef = useRef<boolean>(false);
  const planeRef = useRef<HTMLDivElement>(null);

  // Ref for Lenis smooth scroll instance
  const lenisInstanceRef = useRef<Lenis | null>(null);

  // Telemetry indicators
  const [timeStr, setTimeStr] = useState<string>("");
  const [windowSize, setWindowSize] = useState({ width: 1200, height: 800 });

  // DOM Refs to bypass React re-renders for mouse movement (rendering at 120fps smooth!)
  const displacementMapRef = useRef<SVGFEDisplacementMapElement>(null);
  const mouseCoordsRef = useRef<HTMLSpanElement>(null);
  const backdropArtRef = useRef<HTMLDivElement>(null);
  const heroContainerRef = useRef<HTMLDivElement>(null);
  const sobreMimRef = useRef<HTMLDivElement>(null);

  // Refs for HAOQI-style floating project preview image
  const hoverImageRef = useRef<HTMLDivElement>(null);
  const hoverImgElRef = useRef<HTMLImageElement>(null);
  const xToRef = useRef<any>(null);
  const yToRef = useRef<any>(null);

  const mouseNormRef = useRef({ x: 0, y: 0 });

  // Update window size on mount and resize
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Initialize Lenis smooth scroll and connect with GSAP ScrollTrigger
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // smooth expo easing
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
    });

    lenisInstanceRef.current = lenis;

    // Connect with GSAP ScrollTrigger update
    lenis.on("scroll", () => {
      ScrollTrigger.update();
    });

    const updateLenis = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(updateLenis);
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.destroy();
      gsap.ticker.remove(updateLenis);
      lenisInstanceRef.current = null;
    };
  }, []);

  // Initialize quickTo helpers for the floating project images
  useEffect(() => {
    if (!hoverImageRef.current) return;
    xToRef.current = gsap.quickTo(hoverImageRef.current, "x", { duration: 0.4, ease: "power2.out" });
    yToRef.current = gsap.quickTo(hoverImageRef.current, "y", { duration: 0.4, ease: "power2.out" });
  }, []);

  // Global window mousemove listener to feed handleMouseMove coordinates flawlessly
  useEffect(() => {
    const onGlobalMouseMove = (e: MouseEvent) => {
      handleMouseMove(e.clientX, e.clientY);
    };
    window.addEventListener("mousemove", onGlobalMouseMove);
    return () => {
      window.removeEventListener("mousemove", onGlobalMouseMove);
    };
  }, []);

  // Performance-optimized direct DOM mouse position handler
  const handleMouseMove = (x: number, y: number) => {
    // Track normalized mouse coordinates (-1 to 1) relative to screen center for 3D glass artwork tilt
    mouseNormRef.current = {
      x: (x - window.innerWidth / 2) / (window.innerWidth / 2),
      y: (y - window.innerHeight / 2) / (window.innerHeight / 2)
    };

    // Update the live cursor coordinates in the footer
    if (mouseCoordsRef.current) {
      const padX = String(Math.round(x)).padStart(4, "0");
      const padY = String(Math.round(y)).padStart(4, "0");
      mouseCoordsRef.current.textContent = `${padX} X ${padY} Y`;
    }

    // High-performance liquid glass interaction for "Olá" artwork by proximity calculation
    if (backdropArtRef.current && displacementMapRef.current) {
      const rect = backdropArtRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dist = Math.hypot(x - centerX, y - centerY);

      // Define influence radius (closer to artwork center = stronger distortion wave)
      const maxDist = 600;
      if (dist < maxDist) {
        const strength = (1 - dist / maxDist) * 55;
        gsap.to(displacementMapRef.current, {
          attr: { scale: strength },
          duration: 0.4,
          ease: "power2.out",
          overwrite: "auto"
        });
      } else {
        gsap.to(displacementMapRef.current, {
          attr: { scale: 0 },
          duration: 0.6,
          ease: "power2.out",
          overwrite: "auto"
        });
      }
    }
  };

  // Hover handlers for the HAOQI-style project list table rows
  const handleProjectMouseEnter = (e: React.MouseEvent, imgUrl: string) => {
    if (!hoverImgElRef.current || !hoverImageRef.current) return;
    hoverImgElRef.current.src = imgUrl;
    
    gsap.killTweensOf(hoverImageRef.current);
    // Set initial position immediately to prevent jumping from previous positions
    gsap.set(hoverImageRef.current, {
      x: e.clientX + 15,
      y: e.clientY + 15,
    });
    
    // Animate in: opacity, scale, etc.
    gsap.to(hoverImageRef.current, {
      opacity: 1,
      scale: 1,
      duration: 0.4,
      ease: "power2.out",
    });
    
    // Play subtle hover/click sound if enabled
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
    // Animate out
    gsap.to(hoverImageRef.current, {
      opacity: 0,
      scale: 0.9,
      duration: 0.3,
      ease: "power2.out",
    });
  };

  // Sound play wrappers with guards
  const triggerClick = () => {
    if (soundEnabled) playClickSound();
  };

  const triggerChime = () => {
    if (soundEnabled) playChimeSound();
  };

  const triggerPop = () => {
    if (soundEnabled) playPopSound();
  };

  const navigateTo = (targetId: string) => {
    if (soundEnabled) playClickSound();
    if (isTransitioningRef.current) return;

    if (overlaysRef.current) {
      isTransitioningRef.current = true;
      overlaysRef.current.trigger(isDarkMode, () => {
        if (lenisInstanceRef.current) {
          lenisInstanceRef.current.scrollTo(targetId, { immediate: true });
        } else {
          const el = document.querySelector(targetId);
          if (el) {
            el.scrollIntoView({ behavior: "auto" });
          }
        }
        setCurrentView(targetId === "#trabalho" || targetId === "#manifesto" ? "portfolio" : "hero");
        setTimeout(() => {
          isTransitioningRef.current = false;
        }, 1000);
      });
    } else {
      if (lenisInstanceRef.current) {
        lenisInstanceRef.current.scrollTo(targetId, { duration: 1.2 });
      } else {
        const el = document.querySelector(targetId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
      }
    }
  };

  const toggleTheme = () => {
    if (soundEnabled) playChimeSound();
    const nextMode = !isDarkMode;
    if (overlaysRef.current) {
      isTransitioningRef.current = true;
      overlaysRef.current.trigger(nextMode, () => {
        setIsDarkMode(nextMode);
        setTimeout(() => {
          isTransitioningRef.current = false;
        }, 1000);
      });
    } else {
      setIsDarkMode(nextMode);
    }
  };

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      // Play a confirmation click if turning it ON
      if (next) playClickSound();
      return next;
    });
  };

  const toggleGrid = () => {
    if (soundEnabled) playClickSound();
    setGridMode((prev) => {
      if (prev === "full") return "lines";
      if (prev === "lines") return "off";
      return "full";
    });
  };

  // Live Telemetry Local Time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Calculate GMT string
      const offsetMinutes = now.getTimezoneOffset();
      const offsetHours = -offsetMinutes / 60;
      const gmtSign = offsetHours >= 0 ? "+" : "";
      const gmtStr = `GMT${gmtSign}${offsetHours}`;

      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      
      // Brazilian default timezone label, or dynamic from timezone detection
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
      } catch (e) {
        // Fallback
      }

      setTimeStr(`${gmtStr} ${localeCode} ${hh}:${mm} 22°C`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync index.css theme class on mount/toggle
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [isDarkMode]);

  // Dynamic Looping Video Background, Glass Artwork Backdrop, & Hover effects
  useEffect(() => {
    let targetScrollTop = window.scrollY || document.documentElement.scrollTop;
    let currentScrollTop = targetScrollTop;
    
    // Smooth 3D tilt parameters
    let targetTiltX = 0;
    let targetTiltY = 0;
    let currentTiltX = 0;
    let currentTiltY = 0;
    
    let rafId: number;

    const handleScroll = () => {
      targetScrollTop = window.scrollY || document.documentElement.scrollTop;
    };

    const updateRotationAndTilt = () => {
      // Smoothly interpolate current scroll towards target scroll with easing
      const diff = targetScrollTop - currentScrollTop;
      if (Math.abs(diff) > 0.01) {
        currentScrollTop += diff * 0.08;
      } else {
        currentScrollTop = targetScrollTop;
      }

      // Smoothly interpolate mouse tilt values
      const normX = mouseNormRef.current.x;
      const normY = mouseNormRef.current.y;
      
      targetTiltX = -normY * 18; // Max 18 degrees tilt on X-axis
      targetTiltY = normX * 18;  // Max 18 degrees tilt on Y-axis
      
      currentTiltX += (targetTiltX - currentTiltX) * 0.08;
      currentTiltY += (targetTiltY - currentTiltY) * 0.08;

      const backdropEl = backdropArtRef.current;
      if (backdropEl) {
        // Apply 3D perspective and rotation tilt to the container card
        backdropEl.style.transform = `perspective(1800px) rotateX(${currentTiltX}deg) rotateY(${currentTiltY}deg) scale(1.02)`;

        // Spin the core image on the horizontal axis (rotateX) on scroll
        const imgEl = backdropEl.querySelector("img");
        if (imgEl) {
          const rotation = (currentScrollTop * 0.15) % 360;
          imgEl.style.transform = `translateZ(30px) rotateX(${rotation}deg)`;
        }

        // Parallax shift the ambient colored glow behind
        const glowEl = backdropEl.querySelector(".glass-glow-layer") as HTMLDivElement | null;
        if (glowEl) {
          const glowX = -normX * 30;
          const glowY = -normY * 30;
          glowEl.style.transform = `translateZ(-50px) translate3d(${glowX}px, ${glowY}px, 0)`;
        }

        // Parallax shift the glossy sheen reflection on top in the opposite direction
        const glossEl = backdropEl.querySelector(".glass-gloss-layer") as HTMLDivElement | null;
        if (glossEl) {
          const glossX = -normX * 50;
          const glossY = -normY * 50;
          glossEl.style.transform = `translateZ(60px) translate3d(${glossX}px, ${glossY}px, 0)`;
        }

        // Float the holographic text label on top
        const infoEl = backdropEl.querySelector(".glass-info-layer") as HTMLDivElement | null;
        if (infoEl) {
          infoEl.style.transform = "translateZ(85px)";
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

  // GSAP ScrollTrigger Zoom Out Effect on Scroll
  useEffect(() => {
    const el = heroContainerRef.current;
    if (!el) return;

    const anim = gsap.fromTo(el,
      { 
        scale: 1,
        opacity: 1
      },
      {
        scale: 0.72,
        opacity: 0.3,
        ease: "power1.out",
        scrollTrigger: {
          trigger: "body",
          start: "top top",
          end: "50% top",
          scrub: 1,
        }
      }
    );

    return () => {
      anim.kill();
    };
  }, []);

  // GSAP ScrollTrigger for Horizontal Marquee Text on Scroll
  useEffect(() => {
    const el = document.querySelector(".Horizontal__text");
    if (!el) return;

    const anim = gsap.to(el, {
      xPercent: -75,
      ease: "none",
      scrollTrigger: {
        trigger: ".Horizontal",
        start: "top bottom",
        end: "bottom top",
        scrub: 1,
      }
    });

    return () => {
      anim.kill();
    };
  }, []);

  // GSAP ScrollTrigger for Focus / Defocus elements based on viewport scroll position
  useEffect(() => {
    const elements = document.querySelectorAll(".scroll-focus-blur");
    const triggers: any[] = [];

    elements.forEach((el) => {
      const anim = gsap.fromTo(el,
        { 
          filter: "none", 
          opacity: 0.88,
          scale: 0.99 
        },
        {
          filter: "none",
          opacity: 1,
          scale: 1,
          duration: 0.5,
          ease: "power1.out",
          scrollTrigger: {
            trigger: el,
            start: "top 85%", // Starts focusing when reaching bottom half
            end: "top 45%",   // Reaches peak focus near screen center
            scrub: true,
            toggleActions: "play reverse play reverse",
          }
        }
      );
      triggers.push(anim);
    });

    return () => {
      triggers.forEach((trigger) => trigger.kill());
    };
  }, []);

  // GSAP ScrollTrigger for SplitText character stagger on scroll
  useEffect(() => {
    const containers = document.querySelectorAll(".split-text-container");
    const triggers: any[] = [];

    containers.forEach((container) => {
      const chars = container.querySelectorAll(".split-char");
      if (!chars.length) return;

      const anim = gsap.fromTo(chars,
        {
          y: 70,
          opacity: 0,
        },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.03, // elegant stagger duration
          ease: "power3.out",
          scrollTrigger: {
            trigger: container,
            start: "top 88%",
            toggleActions: "play none none none"
          }
        }
      );
      triggers.push(anim);
    });

    return () => {
      triggers.forEach((trigger) => trigger.kill());
    };
  }, []);



  // GSAP ScrollTrigger for the paper plane flying path
  useEffect(() => {
    const plane = planeRef.current;
    if (!plane) return;

    // We create a timeline linked to the scroll of the page from the first page's footer down to the bottom of the manifesto section
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: ".first-page-footer",
        start: "top bottom", // Starts when the footer enters the viewport
        endTrigger: "#manifesto",
        end: "bottom center", // Ends when manifesto is well in the viewport
        scrub: 1.5, // Smooth scrubbing
      }
    });

    const isMobile = window.innerWidth < 768;
    const widthFactor = isMobile ? 0.35 : 0.85;

    tl.to(plane, {
      x: -window.innerWidth * 0.35 * widthFactor,
      y: 180,
      rotate: -35,
      scale: 1.25,
      ease: "power1.inOut",
    })
    .to(plane, {
      x: window.innerWidth * 0.15 * widthFactor,
      y: 400,
      rotate: 20,
      scale: 1.0,
      ease: "power1.inOut",
    })
    .to(plane, {
      x: -window.innerWidth * 0.2 * widthFactor,
      y: 620,
      rotate: -15,
      scale: 1.1,
      ease: "power1.inOut",
    })
    .to(plane, {
      x: -window.innerWidth * 0.05 * widthFactor,
      y: 800,
      rotate: 0,
      scale: 0.9,
      opacity: 0.9,
      ease: "power1.out",
    });

    return () => {
      tl.kill();
    };
  }, []);

  // GSAP 3D Tilt Hover Effect for the "Sobre Mim" block
  useEffect(() => {
    const el = sobreMimRef.current;
    if (!el) return;

    // Apply the subtle perspective-origin to the parent container
    gsap.set(el, { 
      perspective: 1000, 
      perspectiveOrigin: "70% 30%",
      transformStyle: "preserve-3d"
    });

    const children = el.querySelectorAll("p");
    children.forEach((child) => {
      gsap.set(child, { transformStyle: "preserve-3d" });
    });

    const onMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left; // x position within the element
      const y = e.clientY - rect.top;  // y position within the element
      
      const px = x / rect.width;  // normalized (0 to 1)
      const py = y / rect.height; // normalized (0 to 1)

      // Calculate tilt degrees (tiltX corresponds to Y-axis mouse, tiltY to X-axis mouse)
      const tiltX = (py - 0.5) * -16; // max 16 degrees tilt on X-axis
      const tiltY = (px - 0.5) * 16;  // max 16 degrees tilt on Y-axis

      // Translate children with depth parallax for brutalist tactile feel
      gsap.to(el, {
        rotateX: tiltX,
        rotateY: tiltY,
        scale: 1.05,
        boxShadow: isDarkMode 
          ? "0 20px 40px -10px rgba(0,0,0,0.7), inset 0 0 15px rgba(255,234,42,0.05)"
          : "0 20px 40px -10px rgba(0,0,0,0.08), inset 0 0 15px rgba(0,0,0,0.02)",
        borderColor: isDarkMode ? "rgba(255, 234, 42, 0.25)" : "rgba(0,0,0,0.12)",
        backgroundColor: isDarkMode ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
        duration: 0.35,
        ease: "power2.out",
        overwrite: "auto"
      });

      // Parallax-shift the second paragraph slightly forward for 3D tactile feel
      if (children[1]) {
        gsap.to(children[1], {
          z: 20,
          color: isDarkMode ? "#ffffff" : "#000000",
          duration: 0.35,
          ease: "power2.out",
          overwrite: "auto"
        });
      }
      if (children[0]) {
        gsap.to(children[0], {
          z: 10,
          color: isDarkMode ? "#ffea2a" : "#ca8a04",
          duration: 0.35,
          ease: "power2.out",
          overwrite: "auto"
        });
      }
    };

    const onMouseLeave = () => {
      // Return smoothly to base state
      gsap.to(el, {
        rotateX: 0,
        rotateY: 0,
        scale: 1,
        boxShadow: "none",
        borderColor: "rgba(148, 163, 184, 0.1)",
        backgroundColor: "transparent",
        duration: 0.5,
        ease: "power2.out",
        overwrite: "auto"
      });

      children.forEach((child) => {
        gsap.to(child, {
          z: 0,
          color: "",
          duration: 0.5,
          ease: "power2.out",
          overwrite: "auto"
        });
      });
    };

    el.addEventListener("mousemove", onMouseMove);
    el.addEventListener("mouseleave", onMouseLeave);

    return () => {
      el.removeEventListener("mousemove", onMouseMove);
      el.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [isDarkMode]);

  return (
    <div 
      className={`relative w-full min-h-screen transition-colors duration-1000 select-none swiss-grid-bg
        ${isDarkMode ? "dark bg-[#0e100f] text-stone-100" : "bg-[#fdfbf7] text-stone-900"}
      `}
    >
      {/* SVG Turbulence & Displacement Filter for Interactive Liquefy Effect - Styled inline for robust browser compilation */}
      <svg style={{ position: "absolute", width: "100%", height: "100%", top: 0, left: 0, opacity: 0.01, pointerEvents: "none", zIndex: -1 }} aria-hidden="true">
        <defs>
          <filter id="liquid-glass-distortion" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" result="noise" />
            <feDisplacementMap ref={displacementMapRef} in="SourceGraphic" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      {/* 1. INTERACTIVE CANVAS GRID COMPONENT (Fixed backdrop) */}
      <div className="fixed inset-0 pointer-events-none z-[1]">
        <CanvasGrid 
          isDarkMode={isDarkMode} 
          gridMode={gridMode}
          onMouseMove={handleMouseMove} 
        />
      </div>

      {/* A. SPECTACULAR IRIDESCENT GLOWING "OLÁ" BACKDROP (Fixed behind Section 1 - Shifted up and made larger!) */}
      <div 
        ref={heroContainerRef}
        className="absolute top-[12vh] inset-x-0 flex justify-center items-center pointer-events-none z-[3]"
        style={{ perspective: "1500px", transformStyle: "preserve-3d" }}
      >
        <motion.div
          ref={backdropArtRef}
          className="w-full max-w-[750px] md:max-w-[1050px] lg:max-w-[1300px] aspect-[16/9] px-4 flex justify-center items-center animate-float-slow cursor-pointer pointer-events-auto transition-all duration-300 relative select-none"
          style={{
            transformStyle: "preserve-3d",
          }}
          whileHover={{ scale: 1.05 }}
          onHoverStart={() => {
            if (soundEnabled) playPopSound();
          }}
          transition={{ type: "spring", stiffness: 120, damping: 10 }}
        >
          {/* Layer 1: Ambient Colored Glow Shadow (shifts oppositely for extreme parallax 3D depth) */}
          <div 
            className="glass-glow-layer absolute inset-10 rounded-[60px] filter blur-3xl opacity-35 pointer-events-none transition-transform duration-100 ease-out"
            style={{
              background: "radial-gradient(circle, #ffea2a 0%, #eab308 50%, transparent 100%)",
              transform: "translateZ(-40px)",
              mixBlendMode: "screen"
            }}
          />

          {/* Layer 2: The Core Rotating Plate Image wrapped in a div to separate drop-shadow from the liquid filter */}
          <div
            className="w-full h-full relative z-10 flex items-center justify-center pointer-events-auto"
            style={{
              transform: "translateZ(30px)",
              filter: "drop-shadow(0 15px 35px rgba(0,0,0,0.12))"
            }}
          >
            <img
              src="/src/assets/images/regenerated_image_1782354215634.png"
              onError={(e) => {
                e.currentTarget.src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80";
              }}
              alt="Olá Glass Artwork"
              className="w-full h-full object-contain select-none transition-transform duration-75 ease-out"
              style={{
                filter: "url(#liquid-glass-distortion)"
              }}
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Layer 3: Dynamic Glossy Reflection Highlight (moves with mouse to fake shiny glass refraction) */}
          <div 
            className="glass-gloss-layer absolute inset-0 pointer-events-none rounded-[40px] z-20 transition-transform duration-100 ease-out overflow-hidden"
            style={{
              transform: "translateZ(60px)",
            }}
          >
            <div 
              className="absolute -inset-[50%] opacity-25 dark:opacity-15 pointer-events-none"
              style={{
                background: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.1) 40%, transparent 70%)",
                mixBlendMode: "overlay"
              }}
            />
          </div>

          {/* Layer 4: Fine Holographic / Blueprint Info Overlay (floats high up, perfect for Digital Designers!) */}
          <div 
            className="glass-info-layer absolute inset-x-12 bottom-12 flex justify-between items-end font-mono text-[8px] md:text-[10px] uppercase tracking-[0.25em] text-white/45 dark:text-white/25 pointer-events-none z-30 transition-transform duration-100 ease-out"
            style={{
              transform: "translateZ(80px)"
            }}
          >
            <div className="flex flex-col items-start gap-1">
              <span className="text-yellow-400 font-semibold">[ 3D INTERACTIVE GLASS ]</span>
              <span>RENDER-026 // MODEL-S</span>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span>ESTÚDIO DE DESIGN CREATIVO</span>
              <span>COORD_X: SHD-99</span>
            </div>
          </div>
        </motion.div>
      </div>



      {/* Theme Background (Fixed in backdrop) */}
      <div className={`fixed inset-0 pointer-events-none z-[2] overflow-hidden transition-all duration-1000 ${isDarkMode ? "bg-[#0e100f]" : "bg-[#fdfbf7]"}`}>
        <div className={`absolute inset-0 transition-colors duration-1000 ${isDarkMode ? "bg-[#0e100f]" : "bg-[#fdfbf7]"}`} />
      </div>

      {/* MAIN CONTAINER LAYOUT */}
      <div className="relative z-10 w-full min-h-screen flex flex-col justify-between p-6 md:p-8 font-sans">
        
        {/* ==================== SECTION 1: HERO VIEW ==================== */}
        <section className="relative min-h-[92vh] flex flex-col justify-between w-full">
          
          {/* HEADER SECTION */}
          <header className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start w-full border-b border-slate-400/10 pb-4">
            {/* Left area: Professional areas */}
            <div className="flex flex-col justify-self-start font-mono text-[11px] leading-relaxed select-none text-left">
              <p className="font-bold text-xs uppercase tracking-widest text-[#1a1917] dark:text-white mb-1">ÁREAS DE ATUAÇÃO</p>
              <p className="font-medium text-[#1a1917] dark:text-stone-300">Publicidade, Marketing & Comunicação</p>
            </div>

            {/* Centerpiece Spacer */}
            <div className="hidden md:block" />

            {/* Right column: Sleek Modular Navigation Bar */}
            <nav className="flex items-center gap-3 md:gap-4 justify-self-end font-mono text-[11px] tracking-wider select-none">
              
              <a 
                href="#manifesto" 
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo("#manifesto");
                }}
                className="relative py-1 group font-bold text-[#1a1917] dark:text-white hover:opacity-80 transition-all duration-300"
              >
                PORTFÓLIO
                <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-yellow-400 group-hover:w-full transition-all duration-300" />
              </a>

              <a 
                href="mailto:historicotempo@gmail.com" 
                onClick={triggerClick}
                className="relative py-1 group font-bold text-[#1a1917] dark:text-white hover:opacity-80 transition-all duration-300"
              >
                CONTATO
                <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-yellow-400 group-hover:w-full transition-all duration-300" />
              </a>

              {/* THEME TOGGLE */}
              <button
                onClick={toggleTheme}
                className="flex items-center gap-1 py-1 font-bold text-[#1a1917] dark:text-white hover:opacity-80 transition-all cursor-pointer"
                title="Alternar Tema"
              >
                {isDarkMode ? (
                  <span className="flex items-center gap-0.5">
                    PAPEL<span className="text-[#ffea2a] font-black">[SÉPIA]</span>
                    <Moon size={11} className="inline ml-0.5 text-[#ffea2a]" />
                  </span>
                ) : (
                  <span className="flex items-center gap-0.5">
                    PAPEL<span className="text-amber-900 dark:text-yellow-400 font-black">[MARFIM]</span>
                    <Sun size={11} className="inline ml-0.5 text-amber-900 dark:text-yellow-400" />
                  </span>
                )}
              </button>

              {/* SOUND TOGGLE */}
              <button
                onClick={toggleSound}
                className="flex items-center gap-1 py-1 font-bold text-[#1a1917] dark:text-white hover:opacity-80 transition-all cursor-pointer"
                title="Alternar Efeitos de Som"
              >
                {soundEnabled ? (
                  <span className="flex items-center gap-0.5">
                    SOM<span className="text-green-700 dark:text-green-400 font-black">[•]</span>
                    <Volume2 size={11} className="inline ml-0.5 text-green-700 dark:text-green-400" />
                  </span>
                ) : (
                  <span className="flex items-center gap-0.5">
                    SOM<span className="text-stone-800 dark:text-stone-500 font-black">[ ]</span>
                    <VolumeX size={11} className="inline ml-0.5 text-stone-800 dark:text-stone-500" />
                  </span>
                )}
              </button>
            </nav>
          </header>

          {/* CORE HERO BODY */}
          <div className="relative flex-1 w-full flex flex-col justify-end items-start pb-6 md:pb-10 pt-16 select-none">
            
            {/* Elegant "Sobre Mim" Marginalia Block on the Right Side */}
            <div 
              ref={sobreMimRef}
              className="absolute top-[3%] lg:top-[8%] right-4 lg:right-12 max-w-[280px] lg:max-w-[340px] z-20 font-mono text-[11px] leading-relaxed p-4 rounded-xl border border-slate-400/10 backdrop-blur-[2px] bg-slate-400/[0.03] dark:bg-white/[0.01] select-none pointer-events-auto hidden md:block text-left"
              style={{
                perspectiveOrigin: "70% 30%",
                transformStyle: "preserve-3d",
              }}
            >
              <p className="font-bold text-xs uppercase mb-1.5 tracking-widest text-[#1a1917] dark:text-white flex items-center gap-1.5 transition-colors">
                SOBRE MIM
              </p>
              <p className="text-[#1a1917] dark:text-stone-300 font-medium transition-colors">
                Consultor de design digital especializado em estética sofisticada, tipografia marcante e refinamento visual. Criando portfólios e experiências memoráveis através de sistemas elegantes e respiro visual.
              </p>
            </div>

            {/* B. MASSIVE HEAVY DISPLAY TYPOGRAPHY */}
            <div className="relative flex flex-col text-left max-w-5xl w-full pointer-events-none select-none z-10">
              
              {/* Row 1 */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="overflow-visible py-1"
              >
                <h1 className="font-display font-black tracking-tighter uppercase text-3xl sm:text-5xl md:text-6xl lg:text-7xl leading-none text-[#1a1917] dark:text-white">
                  EU TRAGO
                </h1>
              </motion.div>

              {/* Row 2 */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 1.1, ease: "easeOut", delay: 0.15 }}
                className="overflow-visible py-2"
              >
                <h1 className="font-display font-black tracking-tighter uppercase text-3xl sm:text-5xl md:text-6xl lg:text-7xl leading-none text-[#1a1917] dark:text-white flex flex-wrap items-center justify-start gap-y-2">
                  <span className="relative inline-block px-4 py-1 rounded bg-[#ffea2a] text-black shadow-[0_4px_20px_rgba(255,234,42,0.4)] transform -rotate-[1deg] pointer-events-auto cursor-pointer hover:scale-105 transition-all duration-300"
                    onClick={() => {
                      triggerPop();
                    }}
                  >
                    CAPRICHO
                  </span>
                  <span className="mx-3">&</span>
                  <span className="relative inline-block px-4 py-1 rounded bg-[#ffea2a] text-black shadow-[0_4px_20px_rgba(255,234,42,0.4)] transform rotate-[1deg] pointer-events-auto cursor-pointer hover:scale-105 transition-all duration-300"
                    onClick={() => {
                      triggerPop();
                    }}
                  >
                    BOM GOSTO
                  </span>
                </h1>
              </motion.div>

              {/* Row 3 */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                className="overflow-visible py-1"
              >
                <h1 className="font-display font-black tracking-tighter uppercase text-3xl sm:text-5xl md:text-6xl lg:text-7xl leading-none text-[#1a1917] dark:text-white flex flex-wrap items-center justify-start gap-y-2">
                  <span>À COMUNICAÇÃO E{" "}</span>
                  <span className="relative inline-block px-3 py-0.5 rounded bg-[#ffea2a] text-black shadow-[0_4px_15px_rgba(255,234,42,0.3)] transform -rotate-[0.5deg] pointer-events-auto cursor-pointer hover:scale-105 transition-all duration-300 ml-2"
                    onClick={() => {
                      triggerPop();
                    }}
                  >
                    PUBLICIDADE
                  </span>
                </h1>
              </motion.div>

              {/* Mobile-only "Sobre Mim" block */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.8 }}
                className="mt-8 md:hidden text-left font-mono text-[11px] leading-relaxed text-[#1a1917] dark:text-stone-300 py-1 max-w-sm pointer-events-auto"
              >
                <p className="font-bold text-xs uppercase mb-1 text-[#1a1917] dark:text-white">SOBRE MIM</p>
                <p className="text-[#1a1917] dark:text-stone-300 font-medium">
                  Consultor de design digital especializado em estética sofisticada, tipografia marcante e refinamento visual. Criando portfólios e experiências memoráveis.
                </p>
              </motion.div>

            </div>
          </div>

          {/* ==================== FIRST PAGE FOOTER ==================== */}
          <footer className="first-page-footer w-full border-t border-slate-400/10 pt-4 mt-6 flex justify-start items-center font-mono text-[10px] uppercase tracking-widest text-[#1a1917] dark:text-stone-400 select-none z-20">
            {/* THE PAPER AIRPLANE NEATLY ALIGNED ON THE LEFT WITH NO UNNECESSARY EMPTY SPACE */}
            <div className="flex items-center gap-3">
              <div ref={planeRef} className="will-change-transform z-50">
                <motion.div
                  className="pointer-events-auto cursor-pointer flex items-center justify-center p-2 rounded-full bg-white/5 hover:bg-white/10 dark:bg-stone-900/40 dark:hover:bg-stone-900/60 transition-all duration-300 border border-slate-400/10 hover:border-yellow-400/30"
                  whileHover={{ scale: 1.15, rotate: -15 }}
                  onClick={() => navigateTo("#manifesto")}
                  title="Scroll para Manifesto"
                >
                  <svg 
                    viewBox="0 0 512 512" 
                    className="w-5 h-5 text-[#ffea2a] fill-current filter drop-shadow-[0_2px_4px_rgba(255,234,42,0.4)]"
                  >
                    <path d="M448 256c0-4.4-1.8-8.6-5-11.7l-352-320c-4.3-3.9-10.7-4.6-15.8-1.7-5.1 2.9-8.2 8.3-8.2 14.1l48 160c1.1 3.7 3.8 6.7 7.4 8l192 65.6-192 65.6c-3.6 1.3-6.3 4.3-7.4 8l-48 160c0 5.8 3.1 11.2 8.2 14.1 2.4 1.4 5.1 2.1 7.8 2.1 2.8 0 5.6-.7 8-2.1l352-320c3.2-3.1 5-7.3 5-11.7z" />
                  </svg>
                </motion.div>
              </div>
            </div>
          </footer>
        </section>

        {/* ==================== TRANSITIONAL SECTION: HORIZONTAL SCROLL TEXT ==================== */}
        <section className="Horizontal w-full select-none overflow-hidden my-16 border-t border-b border-slate-400/10 py-8">
          <div className="Horizontal__text font-display uppercase tracking-tighter text-[#1a1917] dark:text-white">
            <span className="heading-xl">DIRETOR DE ARTE</span>
            <span className="heading-xl text-amber-800 dark:text-yellow-400">•</span>
            <span className="heading-xl">DESIGNER DIGITAL</span>
            <span className="heading-xl text-amber-800 dark:text-yellow-400">•</span>
            <span className="heading-xl">ESTÉTICA PREMIUM</span>
            <span className="heading-xl text-amber-800 dark:text-yellow-400">•</span>
            <span className="heading-xl">CRAFT SOFISTICADO</span>
          </div>
        </section>

        {/* ==================== SECTION: MANIFESTO WITH FOCUS / BLUR EFFECT ==================== */}
        <section id="manifesto" className="relative py-28 w-full max-w-4xl mx-auto z-10 text-left px-6 scroll-mt-16">
          <p className="font-mono text-[10px] tracking-[0.2em] text-amber-900 dark:text-[#ffea2a] uppercase font-bold mb-6">MANIFESTO</p>
          <div className="space-y-10">
            <h3 className="scroll-focus-blur font-display text-2xl sm:text-4xl md:text-5xl uppercase font-black text-[#1a1917] dark:text-stone-100 leading-tight">
              Acredito que cada pixel conta uma história. O bom design não é apenas visual; é uma experiência sensorial de harmonia, ritmo e capricho.
            </h3>
            <h3 className="scroll-focus-blur font-display text-2xl sm:text-4xl md:text-5xl uppercase font-black text-[#1a1917] dark:text-stone-100 leading-tight">
              Unindo refinamento estético contemporâneo e interações analógicas para criar soluções de comunicação memoráveis e autênticas.
            </h3>
          </div>
        </section>

        {/* ==================== SECTION 2: PORTFOLIO TABLE (HAOQI-inspired) ==================== */}
        <section id="trabalho" className="relative py-24 w-full max-w-7xl mx-auto z-10 scroll-mt-12">
          <div className="border-t border-slate-400/20 pt-8 mb-16 flex flex-col md:flex-row justify-between items-start gap-4">
            <div>
              <span className="font-mono text-[11px] tracking-widest text-amber-900 dark:text-[#ffea2a] font-bold uppercase">
                <SplitText text="PROJETOS SELECIONADOS [04]" />
              </span>
              <h2 className="font-display font-black tracking-tighter text-4xl sm:text-5xl uppercase text-[#1a1917] dark:text-white mt-2">
                <SplitText text="CRAFT & EXPERIMENTAÇÃO" />
              </h2>
            </div>
            <p className="font-mono text-[11px] leading-relaxed text-[#1a1917] dark:text-stone-300 max-w-sm text-left">
              <SplitText text="Sistemas de marca dinâmicos, publicidade focada em conversão estética e soluções de comunicação digital criadas para causar impacto visual imediato." />
            </p>
          </div>
          
          {/* Minimalist Projects Table (Inspired by HAOQI©2026) */}
          <div className="flex flex-col border-t border-stone-200 dark:border-stone-800/60 mt-8">
            {PROJECTS.map((project, i) => {
              const numStr = String(i + 1).padStart(2, "0");
              return (
                <div
                  key={i}
                  className="grid grid-cols-12 gap-4 items-center py-6 md:py-8 border-b border-stone-200 dark:border-stone-800/60 group pointer-events-auto cursor-pointer transition-colors duration-300 hover:bg-stone-500/[0.02] dark:hover:bg-white/[0.02] px-2"
                  onMouseEnter={(e) => handleProjectMouseEnter(e, project.img)}
                  onMouseMove={handleProjectMouseMove}
                  onMouseLeave={handleProjectMouseLeave}
                  onClick={() => {
                    triggerPop();
                  }}
                >
                  {/* Coluna 1 (largura 1): O número do projeto em formato mono-espaçado */}
                  <div className="col-span-1 font-mono text-xs md:text-sm text-stone-500 dark:text-stone-500 select-none">
                    {numStr}
                  </div>

                  {/* Coluna 2 (largura 5): O título do projeto em caixa alta, negrito e fonte display */}
                  <div className="col-span-5 font-display font-extrabold uppercase text-lg sm:text-2xl md:text-3xl text-[#1a1917] dark:text-stone-100 group-hover:text-amber-900 dark:group-hover:text-[#ffea2a] transition-colors duration-300">
                    {project.title}
                  </div>

                  {/* Coluna 3 (largura 4): A categoria do projeto em fonte mono-espaçada e tamanho menor */}
                  <div className="col-span-4 font-mono text-[10px] md:text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wider text-left">
                    {project.category}
                  </div>

                  {/* Coluna 4 (largura 2): O ano alinhado à direita */}
                  <div className="col-span-2 font-mono text-xs md:text-sm text-stone-600 dark:text-stone-400 text-right font-bold select-none">
                    [{project.year}]
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ==================== FOOTER / TELEMETRY PANEL ==================== */}
        <footer className="grid grid-cols-2 md:grid-cols-3 gap-2 items-center w-full border-t border-slate-400/10 pt-4 text-xs font-mono select-none tracking-widest text-[#1a1917] dark:text-stone-400 mt-12">
          
          {/* Left: Cleared layout spacer */}
          <div className="justify-self-start" />

          {/* Center: Live Cursor Coordinate Indicator */}
          <div className="hidden md:flex items-center gap-2 justify-self-center font-bold font-mono">
            <MousePointer size={12} className="text-yellow-600 dark:text-[#ffea2a]" />
            <span ref={mouseCoordsRef}>
              0000 X 0000 Y
            </span>
          </div>

          {/* Right: Slowly spinning Globe icon representing global craft */}
          <div className="flex items-center gap-2 justify-self-end font-bold">
            <Globe 
              size={14} 
              className="animate-spin-slow text-yellow-600 dark:text-yellow-400 cursor-pointer"
              onClick={() => {
                triggerChime();
              }}
            />
          </div>
        </footer>

        {/* Floating Hover Project Image Container */}
        <div
          ref={hoverImageRef}
          className="fixed top-0 left-0 pointer-events-none z-50 rounded-lg overflow-hidden w-[320px] h-[200px] opacity-0 shadow-2xl scale-90 border border-stone-200/20 dark:border-stone-800/20"
          style={{
            transformStyle: "preserve-3d",
            willChange: "transform, opacity",
          }}
        >
          <img
            ref={hoverImgElRef}
            src={undefined}
            alt="Preview"
            className="w-full h-full object-cover"
          />
        </div>

        {/* LIQUID WAVE SHAPE OVERLAYS PAGE TRANSITION */}
        <ShapeOverlays ref={overlaysRef} />

      </div>
    </div>
  );
}
