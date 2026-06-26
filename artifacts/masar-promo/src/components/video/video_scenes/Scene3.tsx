import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 1700),
      setTimeout(() => setPhase(4), 2400),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const features = [
    { title: "الصلوات والأذكار", color: "text-primary", border: "border-primary" },
    { title: "المهام وجلسات التركيز", color: "text-secondary", border: "border-secondary" },
    { title: "متابعة القرآن الكريم", color: "text-primary", border: "border-primary" },
  ];

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '-100%' }}
      transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
    >
      <div className="w-full max-w-[80vw] mx-auto z-10" dir="rtl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40, scale: 0.9 }}
              animate={phase >= i + 1 ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 40, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className={`bg-bg-light/80 backdrop-blur-md border-t-4 ${feature.border} rounded-2xl p-8 flex items-center justify-center h-48 md:h-64 text-center shadow-xl`}
            >
              <h3 className={`text-[3vw] font-display font-bold ${feature.color}`}>
                {feature.title}
              </h3>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}