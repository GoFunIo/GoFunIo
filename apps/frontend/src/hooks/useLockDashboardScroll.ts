import { getScrollRoot } from '@/utils/scrollRoot';
import { useLayoutEffect } from 'react';

export function useLockDashboardScroll(locked: boolean) {
  useLayoutEffect(() => {
    if (!locked) return;

    const el = getScrollRoot()?.current;
    if (!el) return;

    const original = el.style.overflow;
    el.style.overflow = 'hidden';

    return () => {
      el.style.overflow = original;
    };
  }, [locked]);
}
