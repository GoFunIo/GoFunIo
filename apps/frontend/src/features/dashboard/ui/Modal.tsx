import { useLockDashboardScroll } from '@/hooks/useLockDashboardScroll';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

type Props = {
  children: React.ReactNode;
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  title?: string;
  subtitle?: string;
};

export const Modal = ({ title, subtitle, isOpen, setIsOpen, children }: Props) => {
  useLockDashboardScroll(isOpen);

  useEffect(() => {
    if (!isOpen) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, setIsOpen]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="z-9999 fixed top-0 left-0 flex h-full w-full items-center justify-center bg-black/80"
          onMouseDown={() => setIsOpen(false)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="relative max-h-[90vh] w-full max-w-[800px] overflow-y-auto rounded-[7px] border-icon bg-bg-page p-[25px] md:m-[32px] m-[15px]"
            onMouseDown={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            <button
              type="button"
              className="absolute right-[25px] top-[25px]"
              onClick={() => setIsOpen(false)}
            >
              <X className="cursor-pointer text-content-primary" />
            </button>

            {(title || subtitle) && (
              <div className="mb-[28px]">
                {title && (
                  <p className="mb-2 text-[18px] font-bold text-content-primary">{title}</p>
                )}
                {subtitle && <p className="subtitle text-[16px]">{subtitle}</p>}
              </div>
            )}

            <div>{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
