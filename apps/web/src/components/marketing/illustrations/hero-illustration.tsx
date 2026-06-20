"use client";

import { motion } from "framer-motion";

/** Illustration: rep on laptop + WhatsApp on phone → Growvisi pipeline (no stock photo) */
export function HeroIllustration() {
  return (
    <div className="relative mx-auto aspect-[4/3] w-full max-w-[560px]">
      {/* Ambient glow */}
      <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-accent/20 via-primary/10 to-transparent blur-2xl" />

      <svg
        viewBox="0 0 560 420"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative h-full w-full drop-shadow-2xl"
        aria-hidden
      >
        {/* Desk surface */}
        <ellipse cx="280" cy="380" rx="220" ry="28" fill="#dce9ff" opacity="0.6" />

        {/* Laptop */}
        <motion.g
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <rect x="140" y="200" width="280" height="160" rx="12" fill="#0b1c30" />
          <rect x="152" y="212" width="256" height="120" rx="6" fill="#131b2e" />
          {/* Dashboard on screen */}
          <rect x="162" y="222" width="80" height="100" rx="4" fill="#1a2744" />
          <rect x="168" y="232" width="68" height="8" rx="2" fill="#006c49" opacity="0.8" />
          <rect x="168" y="248" width="50" height="6" rx="2" fill="#3d4f6f" />
          <rect x="168" y="260" width="60" height="6" rx="2" fill="#3d4f6f" />
          <rect x="168" y="272" width="45" height="6" rx="2" fill="#3d4f6f" />
          {/* Pipeline columns on screen */}
          <rect x="252" y="232" width="48" height="80" rx="4" fill="#1e3050" />
          <rect x="258" y="240" width="36" height="14" rx="3" fill="#006c49" opacity="0.9" />
          <rect x="258" y="260" width="36" height="14" rx="3" fill="#2a4060" />
          <rect x="258" y="280" width="36" height="14" rx="3" fill="#2a4060" />
          <rect x="308" y="232" width="90" height="80" rx="4" fill="#1e3050" />
          <path d="M318 250 L388 250" stroke="#006c49" strokeWidth="2" />
          <path d="M318 270 L370 270" stroke="#4a6080" strokeWidth="2" />
          <path d="M318 290 L380 290" stroke="#4a6080" strokeWidth="2" />
          <rect x="120" y="358" width="320" height="12" rx="4" fill="#2a3a55" />
        </motion.g>

        {/* Person */}
        <motion.g
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, duration: 0.6 }}
        >
          {/* Chair back */}
          <rect x="48" y="240" width="56" height="100" rx="8" fill="#c8d4e8" />
          {/* Body */}
          <ellipse cx="76" cy="200" rx="36" ry="40" fill="#006c49" />
          {/* Head */}
          <circle cx="76" cy="148" r="32" fill="#f4c4a0" />
          <path d="M44 148 Q76 120 108 148" fill="#2d1f14" />
          {/* Arm toward laptop */}
          <path d="M100 210 Q140 220 160 240" stroke="#006c49" strokeWidth="18" strokeLinecap="round" />
        </motion.g>

        {/* Phone in hand */}
        <motion.g
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <rect x="380" y="160" width="72" height="128" rx="14" fill="#0b1c30" />
          <rect x="388" y="172" width="56" height="96" rx="8" fill="#ece5dd" />
          {/* WA header */}
          <rect x="388" y="172" width="56" height="22" rx="8" fill="#075e54" />
          <circle cx="400" cy="183" r="5" fill="#fff" opacity="0.9" />
          <rect x="410" y="180" width="24" height="4" rx="2" fill="#fff" opacity="0.7" />
          {/* Chat bubbles */}
          <rect x="394" y="200" width="44" height="22" rx="8" fill="#fff" />
          <rect x="394" y="228" width="36" height="18" rx="8" fill="#d9fdd3" />
          <rect x="402" y="252" width="40" height="16" rx="8" fill="#fff" />
        </motion.g>

        {/* Flow arrow: phone → dashboard */}
        <motion.path
          d="M380 220 Q320 180 280 200"
          stroke="#006c49"
          strokeWidth="2"
          strokeDasharray="6 4"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.7 }}
          transition={{ delay: 0.8, duration: 1.2 }}
        />

        {/* Floating score badge */}
        <motion.g
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        >
          <rect x="420" y="88" width="100" height="48" rx="12" fill="#fff" stroke="#dce9ff" strokeWidth="1" />
          <text x="432" y="108" fill="#45464d" fontSize="10" fontFamily="system-ui">Lead score</text>
          <text x="432" y="128" fill="#006c49" fontSize="20" fontWeight="700" fontFamily="system-ui">92</text>
          <circle cx="500" cy="112" r="14" fill="#ecfdf5" />
          <path d="M494 112 L498 116 L506 106" stroke="#006c49" strokeWidth="2" fill="none" />
        </motion.g>

        {/* Hot lead pulse */}
        <motion.g
          animate={{ scale: [1, 1.05, 1], opacity: [0.9, 1, 0.9] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <rect x="32" y="88" width="120" height="36" rx="18" fill="#006c49" />
          <text x="48" y="111" fill="#fff" fontSize="11" fontWeight="600" fontFamily="system-ui">
            Hot lead · Qualified
          </text>
        </motion.g>

        {/* Incoming message ping */}
        <motion.circle
          cx="448"
          cy="168"
          r="8"
          fill="#25D366"
          animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </svg>
    </div>
  );
}
