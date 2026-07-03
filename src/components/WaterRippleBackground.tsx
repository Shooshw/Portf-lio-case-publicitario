import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function WaterRippleBackground({ isDarkMode }: { isDarkMode: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 });
  const rippleRef = useRef({ scale: 0.0 });
  const lastMousePos = useRef({ x: 0, y: 0, time: Date.now() });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl");
    if (!gl) return;

    const vs = `
      attribute vec2 position;
      varying vec2 vUv;
      void main() {
        vUv = position * 0.5 + 0.5;
        vUv.y = 1.0 - vUv.y;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    const fs = `
      precision highp float;
      varying vec2 vUv;
      uniform vec2 uMouse;
      uniform float uRippleScale;
      uniform float uTime;
      uniform float uAspect;
      uniform float uIsDark;

      void main() {
        vec2 uv = vUv;
        vec2 mouse = uMouse;
        
        vec2 diff = uv - mouse;
        diff.x *= uAspect;
        
        float dist = length(diff);
        
        // Simulação matemática de propagação de água calma (Water Ripples)
        float wave = sin(dist * 35.0 - uTime * 5.0) * exp(-dist * 4.5);
        vec2 distortion = normalize(diff) * wave * uRippleScale * 0.05;
        
        vec2 finalUv = uv + distortion;
        vec2 gridUv = fract(finalUv * vec2(28.0 * uAspect, 28.0));
        
        float dotSize = 0.06;
        float isDot = smoothstep(dotSize, dotSize - 0.02, length(gridUv - 0.5));
        
        // Paleta baseada na estética do Haoqi (Sepia e Obsidian) [cite: 9]
        vec3 dotColor = uIsDark > 0.5 ? vec3(0.2, 0.22, 0.24) : vec3(0.09, 0.1, 0.11);
        vec3 bgColor = uIsDark > 0.5 ? vec3(0.055, 0.062, 0.06) : vec3(0.99, 0.98, 0.97);
        
        vec3 finalColor = mix(bgColor, dotColor, isDot * 0.35);
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    const compileShader = (source: string, type: number) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, source);
      gl.compileShader(s);
      return s;
    };

    const program = gl.createProgram()!;
    gl.attachShader(program, compileShader(vs, gl.VERTEX_SHADER));
    gl.attachShader(program, compileShader(fs, gl.FRAGMENT_SHADER));
    gl.linkProgram(program);
    gl.useProgram(program);

    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const positionLoc = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    const uMouse = gl.getUniformLocation(program, "uMouse");
    const uRippleScale = gl.getUniformLocation(program, "uRippleScale");
    const uTime = gl.getUniformLocation(program, "uTime");
    const uAspect = gl.getUniformLocation(program, "uAspect");
    const uIsDark = gl.getUniformLocation(program, "uIsDark");

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    window.addEventListener("resize", resize);
    resize();

    const onMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      const dt = now - lastMousePos.current.time;
      
      const targetX = e.clientX / window.innerWidth;
      const targetY = e.clientY / window.innerHeight;

      if (dt > 0) {
        const dx = e.clientX - lastMousePos.current.x;
        const dy = e.clientY - lastMousePos.current.y;
        const speed = Math.hypot(dx, dy) / dt;
        
        const intensity = Math.min(speed * 1.8, 3.0);
        if (intensity > 0.15) {
          gsap.to(rippleRef.current, {
            scale: intensity,
            duration: 0.1,
            overwrite: "auto",
            onComplete: () => {
              gsap.to(rippleRef.current, {
                scale: 0.03, // Ondulação sutil contínua
                duration: 1.5,
                ease: "power2.out"
              });
            }
          });
        }
      }

      mouseRef.current.targetX = targetX;
      mouseRef.current.targetY = targetY;
      lastMousePos.current = { x: e.clientX, y: e.clientY, time: now };
    };
    window.addEventListener("mousemove", onMouseMove);

    let animationId: number;
    let startTime = Date.now();

    const render = () => {
      const time = (Date.now() - startTime) * 0.001;

      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.08;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.08;

      gl.uniform2f(uMouse, mouseRef.current.x, mouseRef.current.y);
      gl.uniform1f(uRippleScale, rippleRef.current.scale);
      gl.uniform1f(uTime, time);
      gl.uniform1f(uAspect, window.innerWidth / window.innerHeight);
      gl.uniform1f(uIsDark, isDarkMode ? 1.0 : 0.0);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationId = requestAnimationFrame(render);
    };
    render();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      cancelAnimationFrame(animationId);
    };
  }, [isDarkMode]);

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none z-[1]" />;
}