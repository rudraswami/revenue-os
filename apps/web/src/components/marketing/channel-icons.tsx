"use client";

import { motion } from "framer-motion";

const channels = [
  { name: "WhatsApp", color: "#25D366", icon: "W" },
  { name: "Instagram", color: "#E4405F", icon: "I" },
  { name: "Messenger", color: "#0084FF", icon: "M" },
  { name: "Telegram", color: "#26A5E4", icon: "T" },
];

export function ChannelIcons() {
  return (
    <div className="mb-8 flex items-center justify-center gap-3 md:gap-4">
      {channels.map((ch, i) => (
        <motion.div
          key={ch.name}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + i * 0.08, duration: 0.4 }}
          className={i % 2 === 0 ? "animate-float" : "animate-float-delayed"}
        >
          <div
            className="flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-bold text-white shadow-md md:h-12 md:w-12"
            style={{ backgroundColor: ch.color }}
            title={ch.name}
          >
            {ch.icon}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
