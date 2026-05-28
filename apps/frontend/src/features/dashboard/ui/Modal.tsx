import { useLockDashboardScroll } from '@/hooks/useLockDashboardScroll';
import classNames from 'classnames';
import { X } from 'lucide-react';
import React, { useEffect } from 'react';

type Props = {
  children: React.ReactNode;
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  title?: string;
  subtitle?: string;
};

export const Modal = ({ title, subtitle, isOpen, setIsOpen }: Props) => {
  useLockDashboardScroll(isOpen);

  useEffect(() => {
    if (!isOpen) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, setIsOpen]);

  return (
    <div
      className={classNames(
        'custom-transition z-9999 bg-black/80 fixed top-0 left-0 w-full h-full flex items-center justify-center',
        {
          'opacity-0 pointer-events-none': !isOpen,
          'opacity-100': isOpen,
        },
      )}
      onMouseDown={() => setIsOpen(false)}
    >
      <div
        className="relative max-w-[690px] md:m-[32px] m-[15px] w-full p-[25px] rounded-[7px] border-icon bg-bg-page"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button className="absolute right-[25px] top-[25px]" onClick={() => setIsOpen(false)}>
          <X className="cursor-pointer" />
        </button>

        {(title || subtitle) && (
          <div className="">
            {title && <p className="font-bold text-[16px] text-dark pb-[4px]">{title}</p>}
            {subtitle && <p className="font-normal text-[14px] text-dark">{subtitle}</p>}
          </div>
        )}
      </div>
    </div>
  );
};
