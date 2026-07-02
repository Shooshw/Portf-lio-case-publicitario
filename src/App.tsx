/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

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

  // Telemetry indicators
  const [timeStr, setTimeStr] = useState<string>("");
  const [windowSize, setWindowSize] = useState({ width: 1200, height: 800 });

  // DOM Refs to bypass React re-renders for mouse movement (rendering at 120fps smooth!)
  const lensRef = useRef<HTMLDivElement>(null);
  const mouseCoordsRef = useRef<HTMLSpanElement>(null);
  const backdropArtRef = useRef<HTMLDivElement>(null);
  const heroContainerRef = useRef<HTMLDivElement>(null);
  const sobreMimRef = useRef<HTMLDivElement>(null);
  const trailContainerRef = useRef<HTMLDivElement>(null);
  const lastTrailPosRef = useRef({ x: -1000, y: -1000 });
  const mouseNormRef = useRef({ x: 0, y: 0 });

  // Smooth movement tracking without React re-renders
  const moveTimeoutRef = useRef<any>(null);
  const isMovingRef = useRef<boolean>(false);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (moveTimeoutRef.current) clearTimeout(moveTimeoutRef.current);
    };
  }, []);

  // Update window size on mount and resize
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Performance-optimized direct DOM mouse position handler
  const handleMouseMove = (x: number, y: number) => {
    // Track normalized mouse coordinates (-1 to 1) relative to screen center
    mouseNormRef.current = {
      x: (x - window.innerWidth / 2) / (window.innerWidth / 2),
      y: (y - window.innerHeight / 2) / (window.innerHeight / 2)
    };

    // 1. Position and activate the borderless liquefy lens
    if (lensRef.current) {
      lensRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      lensRef.current.style.opacity = "1";

      // Dynamically activate the liquefy (distortion) filter only when the mouse is moving!
      if (!isMovingRef.current) {
        isMovingRef.current = true;
        lensRef.current.style.backdropFilter = "url(#liquefy-lens)";
        lensRef.current.style.setProperty("-webkit-backdrop-filter", "url(#liquefy-lens)");
      }

      // Clear the timeout to detect when mouse stops moving
      if (moveTimeoutRef.current) {
        clearTimeout(moveTimeoutRef.current);
      }

      // If mouse stays stationary for 150ms, fade out the liquefy lens
      moveTimeoutRef.current = setTimeout(() => {
        isMovingRef.current = false;
        if (lensRef.current) {
          lensRef.current.style.backdropFilter = "none";
          lensRef.current.style.setProperty("-webkit-backdrop-filter", "none");
          lensRef.current.style.opacity = "0";
        }
      }, 150);
    }

    // 1.1 Spawn trail elements if mouse moved enough distance to prevent overcrowding
    const lastPos = lastTrailPosRef.current;
    const dist = Math.hypot(x - lastPos.x, y - lastPos.y);
    if (dist > 8) { // Spawn more frequently for a dense, continuous trail!
      lastTrailPosRef.current = { x, y };
      
      if (trailContainerRef.current) {
        const trail = document.createElement("div");
        trail.className = "absolute pointer-events-none rounded-full";
        
        // Beautiful tapered liquid distortion trail
        const size = 35;
        trail.style.width = `${size}px`;
        trail.style.height = `${size}px`;
        trail.style.left = `${x}px`;
        trail.style.top = `${y}px`;
        trail.style.transform = "translate3d(-50%, -50%, 0) scale(1.1)";
        trail.style.backdropFilter = "url(#liquefy-lens)";
        trail.style.setProperty("-webkit-backdrop-filter", "url(#liquefy-lens)");
        
        // Physically gorgeous liquid glass look
        trail.style.background = isDarkMode
          ? "radial-gradient(circle, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 50%, rgba(255,255,255,0) 100%)"
          : "radial-gradient(circle, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0) 100%)";
        trail.style.boxShadow = isDarkMode
          ? "0 8px 32px 0 rgba(0, 0, 0, 0.2)"
          : "0 8px 32px 0 rgba(31, 38, 135, 0.05)";
        trail.style.opacity = "1";
        trail.style.transition = "transform 1.2s cubic-bezier(0.1, 0.8, 0.2, 1), opacity 1.2s cubic-bezier(0.1, 0.8, 0.2, 1)";

        trailContainerRef.current.appendChild(trail);

        // Schedule fade out and scale down in the next paint frame
        requestAnimationFrame(() => {
          // Force a reflow
          void trail.offsetWidth;
          trail.style.opacity = "0";
          trail.style.transform = "translate3d(-50%, -50%, 0) scale(0.15)";
        });

        // Clean up element from DOM after transition completes
        setTimeout(() => {
          trail.remove();
        }, 1200);
      }
    }

    // 2. Update the live cursor coordinates in the footer
    if (mouseCoordsRef.current) {
      const padX = String(x).padStart(4, "0");
      const padY = String(y).padStart(4, "0");
      mouseCoordsRef.current.textContent = `${padX} X ${padY} Y`;
    }

    // 3. Keep the Iridescent "Olá" Artwork sharp and clear at all times
    if (backdropArtRef.current) {
      backdropArtRef.current.style.filter = "drop-shadow(0 25px 50px rgba(0,0,0,0.18))";
    }
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
        const el = document.querySelector(targetId);
        if (el) {
          el.scrollIntoView({ behavior: "auto" });
        }
        setCurrentView(targetId === "#trabalho" || targetId === "#manifesto" ? "portfolio" : "hero");
        setTimeout(() => {
          isTransitioningRef.current = false;
        }, 1000);
      });
    } else {
      const el = document.querySelector(targetId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
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
      {/* SVG Turbulence & Displacement Filter for Interactive Liquefy Effect */}
      <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
        <defs>
          <filter id="liquefy-lens" x="-50%" y="-50%" width="200%" height="200%">
            {/* Lower baseFrequency makes the distortion ripples much larger */}
            <feTurbulence type="fractalNoise" baseFrequency="0.007" numOctaves="3" result="noise" seed="2" />
            {/* Higher scale makes the organic displacement much more dramatic */}
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="140" xChannelSelector="R" yChannelSelector="G" />
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

          {/* Layer 2: The Core Rotating Plate Image (microwave-style spinning around center on scroll) */}
          <img
            src="/src/assets/images/regenerated_image_1782354215634.png"
            onError={(e) => {
              e.currentTarget.src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80";
            }}
            alt="Olá Glass Artwork"
            className="w-full h-full object-contain pointer-events-none select-none relative z-10 transition-transform duration-75 ease-out"
            style={{
              transform: "translateZ(30px)",
              filter: "drop-shadow(0 15px 35px rgba(0,0,0,0.12))"
            }}
            referrerPolicy="no-referrer"
          />

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

      {/* 1.5 INTERACTIVE LIQUEFY LENS THAT FOLLOWS THE MOUSE (Zero lag direct DOM, raised to z-[4]) */}
      <div
        ref={lensRef}
        className="absolute pointer-events-none z-[4] rounded-full flex items-center justify-center overflow-hidden opacity-0 transition-opacity duration-300"
        style={{
          width: 55,
          height: 55,
          left: 0,
          top: 0,
          transform: "translate3d(-1000px, -1000px, 0)",
          background: isDarkMode 
            ? "radial-gradient(circle, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 60%, rgba(255,255,255,0) 100%)"
            : "radial-gradient(circle, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.02) 60%, rgba(255,255,255,0) 100%)",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 dark:to-white/5 opacity-20 rounded-full" />
      </div>

      {/* High-performance container for the trailing liquefy elements */}
      <div ref={trailContainerRef} className="absolute inset-0 pointer-events-none z-[4] overflow-hidden" />

      {/* Dynamic Looping Video Background (Fixed in backdrop) */}
      <div className={`fixed inset-0 pointer-events-none z-[2] overflow-hidden transition-all duration-1000 ${isDarkMode ? "bg-[#010101]" : "bg-[#fdfbf7]"}`}>
        <div className={`absolute inset-0 transition-colors duration-1000 ${isDarkMode ? "bg-[#010101]" : "bg-[#fdfbf7]"}`} />
        <video
          key={isDarkMode ? "dark" : "light"}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover filter-none pointer-events-none transition-all duration-1000"
          style={{ 
            width: "100%", 
            height: "100%", 
            objectFit: "cover",
            opacity: isDarkMode ? 0.08 : 0.03
          }}
        >
          <source src="https://nicegui.io/static/clouds.mp4" type="video/mp4" />
          <source src="https://assets.mixkit.co/videos/preview/mixkit-clouds-and-blue-sky-background-from-below-14227-large.mp4" type="video/mp4" />
        </video>
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

        {/* ==================== SECTION 2: PORTFOLIO GRID ==================== */}
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
          
          {/* Grid of 4 beautiful portfolio items styled with direct WebGL shader image liquid ripples */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16">
            {PROJECTS.map((project, i) => (
              <div 
                key={i} 
                className="flex flex-col space-y-4 group pointer-events-auto cursor-pointer"
                onClick={() => {
                  triggerPop();
                }}
              >
                <div className="aspect-[4/3] w-full">
                  <ShaderImage 
                    src={project.img} 
                    alt={project.title} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex justify-between items-start pt-2 border-b border-slate-400/10 pb-4">
                  <div className="text-left">
                    <span className="font-mono text-[10px] text-[#1a1917] dark:text-stone-400 font-bold uppercase tracking-wider">
                      <SplitText text={project.category} />
                    </span>
                    <h3 className="font-display font-bold text-xl uppercase text-[#1a1917] dark:text-white mt-1 group-hover:text-amber-900 dark:group-hover:text-[#ffea2a] transition-colors duration-300">
                      <SplitText text={project.title} />
                    </h3>
                    <p className="font-mono text-[11px] leading-relaxed text-[#1a1917] dark:text-stone-400 mt-2 max-w-md">
                      <SplitText text={project.desc} />
                    </p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-mono text-xs font-bold text-[#1a1917] dark:text-white">[{project.year}]</span>
                  </div>
                </div>
              </div>
            ))}
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

        {/* LIQUID WAVE SHAPE OVERLAYS PAGE TRANSITION */}
        <ShapeOverlays ref={overlaysRef} />

      </div>
    </div>
  );
}
