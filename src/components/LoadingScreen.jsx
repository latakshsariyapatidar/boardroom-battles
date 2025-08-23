import React from 'react';
import { motion } from 'framer-motion';

const LoadingScreen = ({ message }) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.5, ease: 'easeInOut' } },
    exit: { opacity: 0, transition: { duration: 0.3 } }
  };

  const pulseVariants = {
    animate: { scale: [1, 1.05, 1], opacity: [0.7, 1, 0.7], transition: { duration: 1.5, repeat: Infinity } }
  };

  return (
    <motion.div
      className="fixed inset-0 bg-[var(--card-bg)] backdrop-filter backdrop-blur-lg flex items-center justify-center z-60"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <div className="text-center glass-card p-6 sm:p-8 rounded-lg max-w-md w-full">
        {/* Logo Animation */}
        <div className="relative mb-6">
          <motion.div
            className="w-20 h-20 mx-auto bg-[var(--button-bg)] rounded-full flex items-center justify-center relative overflow-hidden liquid-hover"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span className="text-3xl text-[var(--text)]">🗳️</span>
            <motion.div
              className="absolute inset-0 border-2 border-[var(--input-focus)] rounded-full"
              animate={{ scale: [1, 1.2, 1], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            />
          </motion.div>
        </div>

        {/* Loading Text */}
        <motion.h2
          className="text-2xl sm:text-3xl font-bold text-[var(--text-heading)] mb-4"
          variants={pulseVariants}
          animate="animate"
        >
          Boardroom Battles
        </motion.h2>

        {/* Progress Bar */}
        <div className="w-48 sm:w-64 mx-auto bg-[var(--card-border)] rounded-full h-3 overflow-hidden">
          <motion.div
            className="h-full bg-[var(--button-bg)] rounded-full"
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 2.5, ease: 'easeInOut', repeat: Infinity }}
          />
        </div>

        <motion.p
          className="text-secondary mt-4 text-sm sm:text-base"
          variants={pulseVariants}
          animate="animate"
        >
          {message || 'Loading...'}
        </motion.p>
      </div>
    </motion.div>
  );
};

export default LoadingScreen;