import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

interface ShaderImageProps {
  src: string;
  alt?: string;
  className?: string;
}

export default function ShaderImage({ src, alt = "", className = "" }: ShaderImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasWebGL, setHasWebGL] = useState(true);
  
  const hoverVal = useRef({ value: 0 });
  const scrollVal = useRef({ value: 0 });
  const animationFrameId = useRef<number | null>(null);
  const glContextRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const textureRef = useRef<WebGLTexture | null>(null);

  // Monitor scroll velocity to feed into the shader
  useEffect(() => {
    let lastScrollY = window.scrollY;
    let velocity = 0;
    
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const diff = currentScrollY - lastScrollY;
      lastScrollY = currentScrollY;
      
      velocity = Math.min(Math.max(diff * 0.05, -3.0), 3.0);
      
      // Smoothly decay scroll value
      gsap.to(scrollVal.current, {
        value: velocity,
        duration: 0.5,
        ease: "power2.out",
        overwrite: "auto"
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    if (!isLoaded || !canvasRef.current || !imgRef.current) return;

    const canvas = canvasRef.current;
    const img = imgRef.current;
    
    // Set canvas dimensions to match image display size
    const resizeCanvas = () => {
      const width = containerRef.current?.clientWidth || img.naturalWidth || 400;
      const height = containerRef.current?.clientHeight || img.naturalHeight || 300;
      canvas.width = width;
      canvas.height = height;
      
      const gl = glContextRef.current;
      if (gl) {
        gl.viewport(0, 0, width, height);
      }
    };
    
    resizeCanvas();
    const resizeObserver = new ResizeObserver(resizeCanvas);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    const gl = canvas.getContext("webgl", { alpha: true, preserveDrawingBuffer: true });
    if (!gl) {
      setHasWebGL(false);
      return;
    }
    glContextRef.current = gl;

    // 1. Vertex Shader Source
    const vsSource = `
      attribute vec2 position;
      attribute vec2 texCoord;
      varying vec2 v_texCoord;
      void main() {
        v_texCoord = texCoord;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    // 2. Fragment Shader Source - fluid liquid distortion
    const fsSource = `
      precision mediump float;
      varying vec2 v_texCoord;
      uniform sampler2D u_image;
      uniform float u_time;
      uniform float u_hover;
      uniform float u_scroll;

      void main() {
        vec2 uv = v_texCoord;
        
        // Fluid ripple effect on coordinates
        // Subtle background floating wave
        float bgWaveX = sin(uv.y * 6.0 + u_time * 1.5) * 0.005;
        float bgWaveY = cos(uv.x * 6.0 + u_time * 1.2) * 0.005;
        
        // Interactive wave on hover
        float hoverWaveX = sin(uv.y * 14.0 - u_time * 3.0) * 0.025 * u_hover;
        float hoverWaveY = cos(uv.x * 14.0 - u_time * 2.5) * 0.025 * u_hover;
        
        // Drag ripple on scroll velocity
        float scrollWaveX = sin(uv.x * 20.0 + u_time * 4.0) * 0.02 * u_scroll;
        float scrollWaveY = cos(uv.y * 20.0 + u_time * 3.5) * 0.02 * u_scroll;

        vec2 distortedUv = vec2(
          uv.x + bgWaveX + hoverWaveX + scrollWaveX,
          uv.y + bgWaveY + hoverWaveY + scrollWaveY
        );

        // Clamping to avoid bleed
        distortedUv = clamp(distortedUv, 0.0, 1.0);
        
        // Texture lookup
        vec4 color = texture2D(u_image, distortedUv);
        
        // Add a gorgeous chromatic aberration style shift on extreme hover/scroll
        float redShift = 0.008 * (u_hover + abs(u_scroll));
        vec2 uvR = clamp(distortedUv + vec2(redShift, 0.0), 0.0, 1.0);
        vec2 uvB = clamp(distortedUv - vec2(redShift * 0.5, 0.0), 0.0, 1.0);
        
        float r = texture2D(u_image, uvR).r;
        float g = color.g;
        float b = texture2D(u_image, uvB).b;
        
        // Tint output slightly dynamically based on dark mode settings or highlights
        gl_FragColor = vec4(r, g, b, color.a);
      }
    `;

    // Helper to compile shaders
    const compileShader = (source: string, type: number): WebGLShader | null => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compiler error: ", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vs = compileShader(vsSource, gl.VERTEX_SHADER);
    const fs = compileShader(fsSource, gl.FRAGMENT_SHADER);
    if (!vs || !fs) {
      setHasWebGL(false);
      return;
    }

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program link error: ", gl.getProgramInfoLog(program));
      return;
    }
    programRef.current = program;

    // Buffer setups
    const vertices = new Float32Array([
      -1.0, -1.0,  0.0, 1.0,
       1.0, -1.0,  1.0, 1.0,
      -1.0,  1.0,  0.0, 0.0,
      -1.0,  1.0,  0.0, 0.0,
       1.0, -1.0,  1.0, 1.0,
       1.0,  1.0,  1.0, 0.0,
    ]);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const positionLoc = gl.getAttribLocation(program, "position");
    const texCoordLoc = gl.getAttribLocation(program, "texCoord");

    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 16, 0);

    gl.enableVertexAttribArray(texCoordLoc);
    gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 16, 8);

    // Create Image Texture
    let texture: WebGLTexture | null = null;
    try {
      texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      
      // Upload image to texture
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      textureRef.current = texture;
    } catch (err) {
      console.warn("Failed to create WebGL texture, falling back to 2D image:", err);
      setHasWebGL(false);
      return;
    }

    // Shader Uniforms
    const uTime = gl.getUniformLocation(program, "u_time");
    const uHover = gl.getUniformLocation(program, "u_hover");
    const uScroll = gl.getUniformLocation(program, "u_scroll");

    gl.useProgram(program);

    let startTime = performance.now();

    const loop = () => {
      const now = performance.now();
      const elapsed = (now - startTime) * 0.001; // in seconds

      gl.clearColor(0.0, 0.0, 0.0, 0.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);
      gl.uniform1f(uTime, elapsed);
      gl.uniform1f(uHover, hoverVal.current.value);
      gl.uniform1f(uScroll, scrollVal.current.value);

      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animationFrameId.current = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      resizeObserver.disconnect();
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      if (gl) {
        if (texture) gl.deleteTexture(texture);
        if (program) gl.deleteProgram(program);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        if (buffer) gl.deleteBuffer(buffer);
      }
    };
  }, [isLoaded, src]);

  const handleMouseEnter = () => {
    gsap.to(hoverVal.current, {
      value: 1,
      duration: 0.8,
      ease: "power2.out",
      overwrite: "auto"
    });
  };

  const handleMouseLeave = () => {
    gsap.to(hoverVal.current, {
      value: 0,
      duration: 0.8,
      ease: "power2.out",
      overwrite: "auto"
    });
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden w-full h-full rounded-xl shadow-lg border border-slate-400/10 cursor-pointer ${className}`}
    >
      {/* Hidden source image to load texture and act as responsive layout driver */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        crossOrigin="anonymous"
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          setIsLoaded(true);
          setHasWebGL(false); // fall back
        }}
        className={`w-full h-full object-cover transition-opacity duration-500 select-none pointer-events-none ${
          hasWebGL && isLoaded ? "opacity-0 absolute pointer-events-none" : "opacity-100"
        }`}
        referrerPolicy="no-referrer"
      />

      {hasWebGL && isLoaded && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full block rounded-xl"
          style={{ mixBlendMode: "normal" }}
        />
      )}
    </div>
  );
}
