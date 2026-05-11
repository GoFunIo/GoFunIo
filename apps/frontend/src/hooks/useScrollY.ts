import { useState, useEffect } from 'react';

export const useScrollY = (threshold = 300) => {
  const [isPassed, setIsPassed] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > threshold) {
        setIsPassed(true);
      } else {
        setIsPassed(false);
      }
    };

    window.addEventListener('scroll', handleScroll);

    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  return isPassed;
};
