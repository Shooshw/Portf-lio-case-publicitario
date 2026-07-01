import { useEffect, useRef } from "react";

interface CanvasGridProps {
  isDarkMode: boolean;
  gridMode?: "full" | "lines" | "off";
  onMouseMove?: (x: number, y: number) => void;
}

interface GridPoint {
  currentX: number;
  currentY: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
}

export default function CanvasGrid({ isDarkMode, gridMode = "lines", onMouseMove }: CanvasGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000, active: false });
  const onMouseMoveRef = useRef(onMouseMove);

  // Keep the callback ref up-to-date without triggering useEffect rebuilds
  useEffect(() => {
    onMouseMoveRef.current = onMouseMove;
  }, [onMouseMove]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let points: GridPoint[][] = [];
    let cols = 0;
    let rows = 0;

    // Grid Parameters
    const SPACING = 150; // Larger grid cell size in pixels
    const INFLUENCE_RADIUS = 100; // How close mouse must be for spotlight
    const STIFFNESS = 0.08; // Spring constant
    const DAMPING = 0.85; // Air resistance / braking

    // Build or rebuild the grid of points based on current canvas size
    const initGrid = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Add safety padding so lines go fully off-screen
      const padding = SPACING;
      cols = Math.ceil((width + padding * 2) / SPACING) + 1;
      rows = Math.ceil((height + padding * 2) / SPACING) + 1;

      points = [];
      for (let r = 0; r < rows; r++) {
        const rowPoints: GridPoint[] = [];
        for (let c = 0; c < cols; c++) {
          const baseX = c * SPACING - padding;
          const baseY = r * SPACING - padding;
          rowPoints.push({
            currentX: baseX,
            currentY: baseY,
            baseX: baseX,
            baseY: baseY,
            vx: 0,
            vy: 0,
          });
        }
        points.push(rowPoints);
      }
    };

    // Resize handler with Device Pixel Ratio adjustment for high-DPI displays
    const handleResize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      
      const width = parent.clientWidth;
      const height = parent.clientHeight;
      
      canvas.width = width;
      canvas.height = height;
      
      initGrid();
    };

    // Observe container resizing to keep drawing perfectly fluid
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    handleResize();

    // The main physics and rendering loop
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Colors based on current theme (Ivory cream and Sepia paper backgrounds)
      const gridColor = isDarkMode 
        ? "rgba(43, 36, 26, 0.08)"    // Warm sepia ink lines
        : "rgba(28, 27, 24, 0.06)";   // Delicate ivory book lines

      const crossColor = isDarkMode
        ? "rgba(43, 36, 26, 0.18)"    // Hand-penciled sepia crosses
        : "rgba(28, 27, 24, 0.15)";   // Clean gray ink crosses

      const glowColor = isDarkMode
        ? "rgba(245, 223, 56, 0.12)"  // Warm golden page glow
        : "rgba(255, 234, 42, 0.1)";   // Soft yellow-marker spotlight glow

      // 1. Draw Mouse Spotlight Glow
      if (mouseRef.current.active) {
        const gradient = ctx.createRadialGradient(
          mouseRef.current.x,
          mouseRef.current.y,
          0,
          mouseRef.current.x,
          mouseRef.current.y,
          INFLUENCE_RADIUS * 1.5
        );
        gradient.addColorStop(0, glowColor);
        gradient.addColorStop(1, "rgba(0,0,0,0)");
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(
          mouseRef.current.x,
          mouseRef.current.y,
          INFLUENCE_RADIUS * 1.5,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      // 2. Physics Update Pass
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const pt = points[r]?.[c];
          if (!pt) continue;

          let targetX = pt.baseX;
          let targetY = pt.baseY;

          // If mouse is within range, push the grid point away
          if (mouseRef.current.active) {
            const dx = mouseRef.current.x - pt.baseX;
            const dy = mouseRef.current.y - pt.baseY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < INFLUENCE_RADIUS) {
              const force = (INFLUENCE_RADIUS - dist) / INFLUENCE_RADIUS; // 0 to 1
              const angle = Math.atan2(dy, dx);
              
              // Displace away from mouse pointer
              const displacement = force * 48; 
              targetX = pt.baseX - Math.cos(angle) * displacement;
              targetY = pt.baseY - Math.sin(angle) * displacement;
            }
          }

          // Spring simulation equations
          const ax = (targetX - pt.currentX) * STIFFNESS - pt.vx * DAMPING;
          const ay = (targetY - pt.currentY) * STIFFNESS - pt.vy * DAMPING;

          pt.vx += ax;
          pt.vy += ay;
          pt.currentX += pt.vx;
          pt.currentY += pt.vy;
        }
      }

      // 3. Grid Lines Draw Pass
      if (gridMode !== "off") {
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;

        // Draw horizontal connections (Dynamic & Wavy!)
        for (let r = 0; r < rows; r++) {
          ctx.beginPath();
          for (let c = 0; c < cols; c++) {
            const pt = points[r]?.[c];
            if (!pt) continue;
            if (c === 0) {
              ctx.moveTo(pt.currentX, pt.currentY);
            } else {
              ctx.lineTo(pt.currentX, pt.currentY);
            }
          }
          ctx.stroke();
        }

        // Draw vertical connections (Dynamic & Wavy!)
        for (let c = 0; c < cols; c++) {
          ctx.beginPath();
          for (let r = 0; r < rows; r++) {
            const pt = points[r]?.[c];
            if (!pt) continue;
            if (r === 0) {
              ctx.moveTo(pt.currentX, pt.currentY);
            } else {
              ctx.lineTo(pt.currentX, pt.currentY);
            }
          }
          ctx.stroke();
        }

        // 4. Draw Intersection Crosses (+) (Dynamic) - ONLY IN FULL MODE!
        if (gridMode === "full") {
          ctx.strokeStyle = crossColor;
          ctx.lineWidth = 1;
          
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const pt = points[r]?.[c];
              if (!pt) continue;
              
              ctx.beginPath();
              // Horizontal tick of the cross
              ctx.moveTo(pt.currentX - 4, pt.currentY);
              ctx.lineTo(pt.currentX + 4, pt.currentY);
              // Vertical tick of the cross
              ctx.moveTo(pt.currentX, pt.currentY - 4);
              ctx.lineTo(pt.currentX, pt.currentY + 4);
              ctx.stroke();
            }
          }
        }
      }

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);

    // Event handlers
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      mouseRef.current.x = x;
      mouseRef.current.y = y;
      mouseRef.current.active = true;

      if (onMouseMoveRef.current) {
        onMouseMoveRef.current(Math.round(x), Math.round(y));
      }
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      const y = e.touches[0].clientY - rect.top;

      mouseRef.current.x = x;
      mouseRef.current.y = y;
      mouseRef.current.active = true;

      if (onMouseMoveRef.current) {
        onMouseMoveRef.current(Math.round(x), Math.round(y));
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleMouseLeave);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleMouseLeave);
      resizeObserver.disconnect();
    };
  }, [isDarkMode, gridMode]);

  return (
    <canvas
      ref={canvasRef}
      id="grid-canvas"
      className="absolute inset-0 pointer-events-none z-[1] w-full h-full block"
    />
  );
}
