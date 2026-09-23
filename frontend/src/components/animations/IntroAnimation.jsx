import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import Wordmark from '../common/Wordmark';
import Logo from '../../assets/Logo.png';

const IntroAnimation = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [greetingIndex, setGreetingIndex] = useState(0);

  const greetings = [
    { text: 'नमस्ते', lang: 'Hindi' },
    { text: 'వనక్కం', lang: 'Telugu' },
    { text: 'வணக்கம்', lang: 'Tamil' },
    { text: 'ನಮಸ್ಕಾರ', lang: 'Kannada' },
    { text: 'നമസ്കാരം', lang: 'Malayalam' },
    { text: 'নমস্কার', lang: 'Bengali' },
    { text: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ', lang: 'Punjabi' },
    { text: 'નમસ્તે', lang: 'Gujarati' }
  ];

  useEffect(() => {
    const greetingInterval = setInterval(() => {
      setGreetingIndex((prev) => (prev + 1) % greetings.length);
    }, 900);

    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 5000);

    return () => {
      clearInterval(greetingInterval);
      clearTimeout(timer);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-parchment-100"
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-forest-200/25 via-brass-100/15 to-transparent" />

        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute -top-60 -right-60 w-[500px] h-[500px] bg-forest-300/20 rounded-full blur-3xl"
            animate={{
              x: [0, -150, 0],
              y: [0, 80, 0],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute -bottom-60 -left-60 w-[600px] h-[600px] bg-brass-200/20 rounded-full blur-3xl"
            animate={{
              x: [0, 150, 0],
              y: [0, -80, 0],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-forest-100/25 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </div>

        <div className="relative text-center px-6 max-w-4xl w-full">
          <motion.div
            initial={{ scale: 0.2, opacity: 0, rotateZ: -180 }}
            animate={{ scale: 1, opacity: 1, rotateZ: 0 }}
            transition={{
              duration: 1.5,
              type: "spring",
              stiffness: 80,
              damping: 25
            }}
            className="mb-8 relative"
          >
            <div className="w-48 h-48 mx-auto relative">
              <motion.div
                className="absolute inset-0 rounded-full"
                animate={{
                  boxShadow: [
                    '0 0 40px rgba(57, 100, 71, 0.2)',
                    '0 0 100px rgba(184, 134, 58, 0.35)',
                    '0 0 40px rgba(57, 100, 71, 0.2)'
                  ]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-forest-400/30"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0.1, 0.5]
                }}
                transition={{
                  duration: 3.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              <motion.div
                className="absolute inset-0 rounded-full border border-forest-300/20"
                animate={{
                  scale: [1, 1.4, 1],
                  opacity: [0.3, 0, 0.3]
                }}
                transition={{
                  duration: 4.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.5
                }}
              />
              <motion.div
                className="absolute inset-0 rounded-full border border-brass-300/25"
                animate={{
                  scale: [1, 1.6, 1],
                  opacity: [0.2, 0, 0.2]
                }}
                transition={{
                  duration: 5.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1
                }}
              />
              <img 
                src={Logo}
                alt="AarogyaSandesh Logo" 
                className="w-40 h-40 object-contain relative z-10"
              />
            </div>
          </motion.div>

          <motion.div
            className="mb-2"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={greetingIndex}
                initial={{ y: 30, opacity: 0, scale: 0.8 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -30, opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.5 }}
                className="text-5xl md:text-6xl font-bold text-forest-800/80"
                style={{ fontFamily: "'Noto Sans Devanagari', 'Noto Sans Telugu', 'Noto Sans Tamil', 'Noto Sans Kannada', 'Noto Sans Malayalam', 'Noto Sans Bengali', 'Noto Sans Gurmukhi', 'Noto Sans Gujarati', sans-serif" }}
              >
                {greetings[greetingIndex].text}
                <span className="text-sm md:text-base text-brass-500/60 ml-4 font-mono font-normal">
                  {greetings[greetingIndex].lang}
                </span>
              </motion.div>
            </AnimatePresence>
          </motion.div>

          <motion.h1
            className="font-display font-bold text-forest-950 mb-3 tracking-tight whitespace-nowrap"
            style={{ fontSize: 'clamp(2.25rem, 11vw, 6rem)' }}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.7, type: "spring" }}
          >
            Aarogya <span className="font-devanagari text-brass-600">संदेश</span>
          </motion.h1>

          <motion.p
            className="text-lg md:text-xl text-slate-500 font-light tracking-[0.5em] uppercase"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.6 }}
          >
            A Health Update, Delivered
          </motion.p>

          <motion.div
            className="mt-8 flex justify-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full"
                style={{ 
                  background: `hsl(${160 + i * 12}, 70%, ${45 + i * 4}%)` 
                }}
                animate={{
                  scale: [1, 2.5, 1],
                  opacity: [0.3, 1, 0.3],
                  y: [0, -10, 0]
                }}
                transition={{
                  duration: 1.6,
                  delay: i * 0.1,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            ))}
          </motion.div>

          <motion.div
            className="mt-8 w-72 h-px bg-gradient-to-r from-transparent via-brass-400/50 to-transparent mx-auto"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 1.2, duration: 1 }}
          />

          <motion.div
            className="mt-6 flex items-center justify-center gap-6 text-sm text-gray-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
          >
            <span className="flex items-center gap-1.5">
              <span className="text-lg">🇮🇳</span>
              Made in India
              <span className="text-lg">🇮🇳</span>
            </span>
            <span className="w-px h-4 bg-gray-300/50" />
            <span className="flex items-center gap-1.5">
              <span className="text-rose-400 text-lg">❤️</span>
              With Care
              <span className="text-rose-400 text-lg">❤️</span>
            </span>
          </motion.div>

          <motion.div
            className="mt-4 flex items-center justify-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.8 }}
          >
            <div className="flex gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/70"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400/70"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/70"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/70"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400/70"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/70"></span>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default IntroAnimation;