// components/Lightbox.tsx

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface LightboxProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc?: string;
}

export const Lightbox = ({ isOpen, onClose, imageSrc }: LightboxProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex items-center justify-center p-4"
          onClick={onClose}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
            onClick={onClose}
          >
            <X className="h-8 w-8" />
          </button>
          <motion.img
            src={imageSrc}
            alt="Enlarged view"
            className="max-w-full max-h-full object-contain"
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};