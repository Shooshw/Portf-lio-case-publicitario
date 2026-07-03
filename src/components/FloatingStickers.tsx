import { motion } from "framer-motion";
import { playPopSound } from "./AudioEngine";

interface StickerItem {
  id: string;
  text: string;
  sub: string;
  x: string;
  y: string;
  rotate: number;
  bg: string;
  textColor: string;
  border: string;
}

const STICKERS: StickerItem[] = [
  {
    id: "st-1",
    text: "CRIATIVIDADE",
    sub: "INTERAÇÕES LÍQUIDAS",
    x: "8%",
    y: "40%",
    rotate: -8,
    bg: "bg-amber-100 dark:bg-amber-950/40",
    textColor: "text-amber-900 dark:text-amber-200",
    border: "border-amber-400/30 dark:border-amber-500/20",
  },
  {
    id: "st-2",
    text: "DESIGN CRÍTICO",
    sub: "SUIÇO // 2026",
    x: "78%",
    y: "18%",
    rotate: 12,
    bg: "bg-red-100 dark:bg-red-950/40",
    textColor: "text-red-900 dark:text-red-200",
    border: "border-red-400/30 dark:border-red-500/20",
  },
  {
    id: "st-3",
    text: "CRIATIVO & DIRETOR",
    sub: "COMUNICAÇÃO SENSORIAL",
    x: "82%",
    y: "55%",
    rotate: -4,
    bg: "bg-emerald-100 dark:bg-emerald-950/40",
    textColor: "text-emerald-900 dark:text-emerald-200",
    border: "border-emerald-400/30 dark:border-emerald-500/20",
  },
  {
    id: "st-4",
    text: "ESTÉTICA PURA",
    sub: "CAPRICHO ILIMITADO",
    x: "5%",
    y: "75%",
    rotate: 15,
    bg: "bg-stone-100 dark:bg-stone-900/60",
    textColor: "text-stone-800 dark:text-stone-200",
    border: "border-stone-400/30 dark:border-stone-700/50",
  }
];

export default function FloatingStickers() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-[4]">
      {STICKERS.map((st) => (
        <motion.div
          key={st.id}
          drag
          dragMomentum={true}
          whileDrag={{ scale: 1.05, rotate: st.rotate * 1.5, zIndex: 100 }}
          onDragStart={() => playPopSound()}
          initial={{ opacity: 0, scale: 0.8, x: 0, y: 0 }}
          animate={{
            opacity: 1,
            scale: 1,
            left: st.x,
            top: st.y,
            rotate: st.rotate,
          }}
          transition={{
            type: "spring",
            stiffness: 100,
            damping: 15,
            delay: 0.5,
          }}
          className={`absolute pointer-events-auto cursor-grab active:cursor-grabbing p-3 rounded-md border backdrop-blur-md shadow-sm select-none ${st.bg} ${st.textColor} ${st.border} transition-colors duration-300 max-w-[180px] sm:max-w-[220px]`}
          style={{ position: "absolute" }}
        >
          <div className="flex flex-col gap-1">
            <span className="font-display font-black tracking-tighter text-xs sm:text-sm uppercase leading-none">
              {st.text}
            </span>
            <span className="font-mono text-[8px] sm:text-[9px] tracking-widest opacity-60 uppercase">
              {st.sub}
            </span>
          </div>
          {/* Sutil detalhe decorativo vintage */}
          <div className="absolute top-1.5 right-1.5 w-1 h-1 rounded-full bg-current opacity-30" />
        </motion.div>
      ))}
    </div>
  );
}
