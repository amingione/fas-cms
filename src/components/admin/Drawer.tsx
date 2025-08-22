import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  width?: number;
};
export default function Drawer({ open, onClose, title, children, width = 480 }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: width, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: width, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 330, damping: 32 }}
            className="fixed right-0 top-0 h-full z-[9999] border-l border-white/10 bg-neutral-950 w-full md:w-[480px]"
            style={{ width }}
          >
            <header className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="font-semibold">{title}</h2>
              <button onClick={onClose} className="text-white/70 hover:text-white">
                ✕
              </button>
            </header>
            <div className="p-5 overflow-y-auto h-[calc(100%-56px)]">{children}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
