import React from 'react';
import { ArrowUp } from 'lucide-react';
import { useScrollY } from './../hooks/useScrollY';

export const BackToTop = () => {
  const isVisible = useScrollY(300);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <button
      onClick={scrollToTop}
      style={{
        opacity: isVisible ? 1 : 0,
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
      className="fixed bottom-6 right-5 z-50 flex items-center justify-center w-10 h-10 rounded-[7px] bg-primary text-white shadow-lg hover:bg-secondary hover:-translate-y-1 active:scale-90 transition-all duration-300"
      aria-label="Back to top"
    >
      <ArrowUp size={20} strokeWidth={4} />
    </button>
  );
};
