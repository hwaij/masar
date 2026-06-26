import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1200),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      <div className="text-center z-10 w-full" dir="rtl">
        <motion.div
          initial={{ height: 0 }}
          animate={phase >= 1 ? { height: '12vh' } : { height: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="w-1 bg-secondary mx-auto mb-8"
        />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-[5vw] font-display font-bold text-text-primary mb-4">
            تتبع تقدمك، حافظ على استمراريتك
          </h2>
          <p className="text-[2.5vw] font-body text-secondary">
            نظام نقاط وإحصائيات ذكية تحفزك كل يوم
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}