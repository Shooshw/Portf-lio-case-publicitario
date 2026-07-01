/**
 * Custom Synthesizer using Web Audio API for high-end portfolio micro-interactions.
 * No external file dependencies - fully synthesized, client-side, lightweight, and robust.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

// Play a subtle retro-chic mechanical click
export function playClickSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Mechanical woody click
    osc.type = "sine";
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.05);

    gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    osc.start();
    osc.stop(ctx.currentTime + 0.06);
  } catch (e) {
    console.warn("Audio click playback failed", e);
  }
}

// Play a hollow "pop" sound suited for dragging or grabbing stickers
export function playPopSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Bubble-like round pop
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.08);

    gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.start();
    osc.stop(ctx.currentTime + 0.09);
  } catch (e) {
    console.warn("Audio pop playback failed", e);
  }
}

// Play a soft digital chime when switching themes or loading a special mode
export function playChimeSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    
    // Synthesize a dual-tone warm bell
    const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5 major triad
    freqs.forEach((f, index) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(f, now + index * 0.04);
      
      gainNode.gain.setValueAtTime(0.0, now);
      gainNode.gain.linearRampToValueAtTime(0.04, now + index * 0.04 + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + index * 0.04 + 0.3);

      osc.start(now + index * 0.04);
      osc.stop(now + index * 0.04 + 0.35);
    });
  } catch (e) {
    console.warn("Audio chime playback failed", e);
  }
}
