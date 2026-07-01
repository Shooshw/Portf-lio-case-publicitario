import { forwardRef, useImperativeHandle, useState, useRef } from "react";
import { motion } from "motion/react";

export interface ShapeOverlaysRef {
  trigger: (isTargetDark: boolean, onCovered: () => void) => void;
}

export const ShapeOverlays = forwardRef<ShapeOverlaysRef, {}>((_, ref) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [targetDark, setTargetDark] = useState(false);
  const [animationStep, setAnimationStep] = useState<"initial" | "full" | "final">("initial");

  const onCoveredRef = useRef<(() => void) | null>(null);

  useImperativeHandle(ref, () => ({
    trigger: (isTargetDark, onCovered) => {
      if (isAnimating) return;
      
      setIsAnimating(true);
      setTargetDark(isTargetDark);
      onCoveredRef.current = onCovered;
      
      // Step 1: Rise up and cover the screen
      setAnimationStep("full");
    }
  }));

  // Define the bezier curve paths for different states of viewBox 0 0 100 100
  const pathVariants = {
    initial: {
      d: "M 0 100 C 30 100, 70 100, 100 100 L 100 100 L 0 100 Z"
    },
    full: {
      d: "M 0 0 C 30 0, 70 0, 100 0 L 100 100 L 0 100 Z"
    },
    final: {
      d: "M 0 0 C 30 0, 70 0, 100 0 L 100 0 L 0 0 Z"
    }
  };

  // Intermediate curve shapes to inject into the transition to make it look like a wavy liquid
  // We can use framer-motion's keyframes by passing an array of path strings!
  // This is extremely powerful because it forces a liquid morphing wave during transition.
  const path1Keyframes = [
    "M 0 100 C 30 100, 70 100, 100 100 L 100 100 L 0 100 Z", // initial
    "M 0 100 C 30 40, 70 15, 100 65 L 100 100 L 0 100 Z",   // liquid rise wave
    "M 0 0 C 30 0, 70 0, 100 0 L 100 100 L 0 100 Z"          // full covered
  ];

  const path1RevealKeyframes = [
    "M 0 0 C 30 0, 70 0, 100 0 L 100 100 L 0 100 Z",          // full covered
    "M 0 0 C 30 45, 70 15, 100 0 L 100 0 L 0 0 Z",           // liquid fall reveal
    "M 0 0 C 30 0, 70 0, 100 0 L 100 0 L 0 0 Z"              // final collapsed
  ];

  const path2Keyframes = [
    "M 0 100 C 30 100, 70 100, 100 100 L 100 100 L 0 100 Z",
    "M 0 100 C 25 50, 75 25, 100 70 L 100 100 L 0 100 Z",   // slightly different wave curve
    "M 0 0 C 30 0, 70 0, 100 0 L 100 100 L 0 100 Z"
  ];

  const path2RevealKeyframes = [
    "M 0 0 C 30 0, 70 0, 100 0 L 100 100 L 0 100 Z",
    "M 0 0 C 25 35, 75 55, 100 0 L 100 0 L 0 0 Z",          // opposite wave curve for organic liquid stagger
    "M 0 0 C 30 0, 70 0, 100 0 L 100 0 L 0 0 Z"
  ];

  const path3Keyframes = [
    "M 0 100 C 30 100, 70 100, 100 100 L 100 100 L 0 100 Z",
    "M 0 100 C 35 60, 65 30, 100 80 L 100 100 L 0 100 Z",
    "M 0 0 C 30 0, 70 0, 100 0 L 100 100 L 0 100 Z"
  ];

  const path3RevealKeyframes = [
    "M 0 0 C 30 0, 70 0, 100 0 L 100 100 L 0 100 Z",
    "M 0 0 C 35 50, 65 20, 100 0 L 100 0 L 0 0 Z",
    "M 0 0 C 30 0, 70 0, 100 0 L 100 0 L 0 0 Z"
  ];

  // Colors for the layers:
  // Layer 1: Bright Yellow (#ffea2a)
  // Layer 2: Deep Amber (#ca8a04)
  // Layer 3: Theme-matching background (#0e100f for dark, #fdfbf7 for light)
  const layer3Color = targetDark ? "#0e100f" : "#fdfbf7";

  const handleAnimationComplete = () => {
    if (animationStep === "full") {
      // Execute state change callback exactly when screen is fully covered!
      if (onCoveredRef.current) {
        onCoveredRef.current();
        onCoveredRef.current = null;
      }
      
      // Delay slightly at full coverage to let content render, then drop
      setTimeout(() => {
        setAnimationStep("final");
      }, 50);
    } else if (animationStep === "final") {
      // Reset back to initial state
      setIsAnimating(false);
      setAnimationStep("initial");
    }
  };

  if (!isAnimating) return null;

  return (
    <svg
      className="shape-overlays fixed inset-0 w-full h-full pointer-events-auto z-[9999]"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ mixBlendMode: "normal" }}
    >
      {/* LAYER 1: Signature Brand Yellow */}
      <motion.path
        animate={{
          d: animationStep === "full" ? path1Keyframes : path1RevealKeyframes
        }}
        transition={{
          duration: 0.82,
          ease: "easeInOut",
        }}
        fill="#ffea2a"
      />

      {/* LAYER 2: Deep Tactile Amber */}
      <motion.path
        animate={{
          d: animationStep === "full" ? path2Keyframes : path2RevealKeyframes
        }}
        transition={{
          duration: 0.82,
          ease: "easeInOut",
          delay: 0.08, // Subtle lag for beautiful liquid stretch
        }}
        fill="#ca8a04"
      />

      {/* LAYER 3: Target Page Theme Color (deep charcoal or warm paper-white) */}
      <motion.path
        animate={{
          d: animationStep === "full" ? path3Keyframes : path3RevealKeyframes
        }}
        transition={{
          duration: 0.82,
          ease: "easeInOut",
          delay: 0.16, // Reveals last to seamlessly fade into the new page state
        }}
        fill={layer3Color}
        onAnimationComplete={handleAnimationComplete}
      />
    </svg>
  );
});

ShapeOverlays.displayName = "ShapeOverlays";
