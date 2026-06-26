import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 600),
      setTimeout(() => setPhase(2), 1400),
      setTimeout(() => setPhase(3), 2200),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      initial={{ clipPath: 'circle(0% at 50% 50%)' }}
      animate={{ clipPath: 'circle(150% at 50% 50%)' }}
      exit={{ opacity: 0, filter: 'blur(10px)' }}
      transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1] }}
    >
      <div className="text-center z-10 flex flex-col items-center" dir="rtl">
        <motion.div
          initial={{ scale: 0, opacity: 0, rotate: -45 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
          className="w-32 h-32 md:w-48 md:h-48 rounded-3xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(201,162,75,0.3)]"
        >
          <span className="text-[5vw] font-display font-bold text-bg-dark">مسار</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8 }}
          className="text-[4.5vw] font-display font-bold text-text-primary mb-2"
        >
          يجمع بين دنياك وآخرتك
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="text-[2.5vw] font-body text-text-secondary"
        >
          تنظيم الوقت، العبادات، والمهام في مكان واحد
        </motion.p>
      </div>
    </motion.div>
  );
}