import { motion } from "framer-motion";

type IllustrationType = "empty-list" | "no-results" | "no-data" | "success" | "error";

export function EmptyIllustration({ type, className }: { type: IllustrationType; className?: string }) {
  const colors = {
    chestnut: "#7B4935",
    copper: "#B8895B",
    sand: "#E7D7C3",
    cream: "#F7F3EB",
    muted: "#76685E",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={className}
    >
      <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        {type === "empty-list" && (
          <>
            {/* Document/clipboard illustration */}
            <motion.rect
              x="35" y="25" width="50" height="65" rx="6"
              fill={colors.cream} stroke={colors.copper} strokeWidth="2"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6 }}
            />
            <rect x="45" y="20" width="30" height="12" rx="3" fill={colors.chestnut} />
            <line x1="42" y1="42" x2="78" y2="42" stroke={colors.sand} strokeWidth="2.5" strokeLinecap="round" />
            <line x1="42" y1="52" x2="78" y2="52" stroke={colors.sand} strokeWidth="2.5" strokeLinecap="round" />
            <line x1="42" y1="62" x2="68" y2="62" stroke={colors.sand} strokeWidth="2.5" strokeLinecap="round" />
            <motion.circle cx="85" cy="80" r="12" fill={colors.cream} stroke={colors.copper} strokeWidth="2"
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: "spring" }} />
            <path d="M80 80 L84 84 L91 76" stroke={colors.chestnut} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </>
        )}
        {type === "no-results" && (
          <>
            {/* Magnifying glass illustration */}
            <motion.circle cx="50" cy="50" r="22" fill={colors.cream} stroke={colors.copper} strokeWidth="3"
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }} />
            <line x1="66" y1="66" x2="85" y2="85" stroke={colors.chestnut} strokeWidth="4" strokeLinecap="round" />
            <line x1="42" y1="48" x2="58" y2="48" stroke={colors.sand} strokeWidth="2.5" strokeLinecap="round" />
            <line x1="42" y1="55" x2="54" y2="55" stroke={colors.sand} strokeWidth="2.5" strokeLinecap="round" />
          </>
        )}
        {type === "no-data" && (
          <>
            {/* Empty box illustration */}
            <motion.g initial={{ y: 5 }} animate={{ y: 0 }} transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}>
              <path d="M30 45 L60 30 L90 45 L60 60 Z" fill={colors.cream} stroke={colors.copper} strokeWidth="2" strokeLinejoin="round" />
              <path d="M30 45 L30 75 L60 90 L60 60 Z" fill={colors.cream} stroke={colors.copper} strokeWidth="2" strokeLinejoin="round" opacity="0.7" />
              <path d="M90 45 L90 75 L60 90 L60 60 Z" fill={colors.sand} stroke={colors.copper} strokeWidth="2" strokeLinejoin="round" opacity="0.5" />
            </motion.g>
            <motion.circle cx="60" cy="25" r="4" fill={colors.chestnut} opacity="0.4"
              initial={{ y: 0 }} animate={{ y: 8 }} transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse" }} />
          </>
        )}
        {type === "success" && (
          <>
            <motion.circle cx="60" cy="60" r="30" fill={colors.cream} stroke="#47744F" strokeWidth="3"
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }} />
            <motion.path d="M48 60 L56 68 L73 51" stroke="#47744F" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.3, duration: 0.4 }} />
          </>
        )}
        {type === "error" && (
          <>
            <motion.circle cx="60" cy="60" r="30" fill={colors.cream} stroke="#A53D35" strokeWidth="3"
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }} />
            <motion.line x1="50" y1="50" x2="70" y2="70" stroke="#A53D35" strokeWidth="3.5" strokeLinecap="round"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.2, duration: 0.2 }} />
            <motion.line x1="70" y1="50" x2="50" y2="70" stroke="#A53D35" strokeWidth="3.5" strokeLinecap="round"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.3, duration: 0.2 }} />
          </>
        )}
      </svg>
    </motion.div>
  );
}
