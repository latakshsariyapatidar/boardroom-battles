import React from 'react';
import { motion } from 'framer-motion';

const Modal = ({ isOpen, onClose, onSubmit, title, children, submitText, cancelText }) => {
  if (!isOpen) return null;

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 0 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 15, stiffness: 300 } },
    exit: { opacity: 0, scale: 0.8, y: 0, transition: { duration: 0.3 } }
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 0.8, transition: { duration: 0.3 } },
    exit: { opacity: 0, transition: { duration: 0.3 } }
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 backdrop-filter backdrop-blur-sm z-50 flex items-center justify-center p-4"
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <motion.div
        className="glass-card p-4 sm:p-6 rounded-lg w-full max-w-md"
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <h2 className="text-lg sm:text-xl font-semibold mb-4 text-[var(--text-heading)] text-center">{title}</h2>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4">
          {children}
          <div className="flex justify-end space-x-4 mt-6">
            <motion.button
              type="button"
              onClick={onClose}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition font-medium liquid-hover"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {cancelText || 'Cancel'}
            </motion.button>
            <motion.button
              type="submit"
              className="bg-[var(--button-bg)] text-white px-4 py-2 rounded-lg hover:bg-[var(--button-hover)] transition font-medium liquid-hover"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {submitText || 'Submit'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default Modal;