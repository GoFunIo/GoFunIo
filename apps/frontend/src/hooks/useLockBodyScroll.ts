import { useEffect } from 'react';

export const useLockBodyScroll = (isLocked: boolean) => {
  useEffect(() => {
    if (isLocked) {
      const originalOverflow = document.body.style.overflow;
      const originalHeight = document.body.style.height;

      document.body.style.overflow = 'hidden';
      document.body.style.height = '100vh';

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.height = originalHeight;
      };
    }
  }, [isLocked]);
};
