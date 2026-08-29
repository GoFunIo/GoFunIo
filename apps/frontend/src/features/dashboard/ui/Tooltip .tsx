import { ReactNode, useEffect, useRef, useState } from 'react';
import classNames from 'classnames';

type TooltipProps = {
  content: string;
  children: ReactNode;
  className?: string;
};

export const Tooltip = ({ content, children, className }: TooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isVisible) return;

    const handleOutsideTap = (e: PointerEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) {
        setIsVisible(false);
      }
    };

    document.addEventListener('pointerdown', handleOutsideTap);
    return () => document.removeEventListener('pointerdown', handleOutsideTap);
  }, [isVisible]);

  if (!content) {
    return <>{children}</>;
  }

  return (
    <div
      ref={wrapperRef}
      className={classNames('relative inline-flex', className)}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onClick={(e) => {
        e.stopPropagation();
        setIsVisible((prev) => !prev);
      }}
    >
      {children}

      {isVisible && (
        <div
          role="tooltip"
          className="absolute bottom-full left-0 mb-2 z-50 w-max max-w-[250px] rounded-[3px] bg-info px-[8px] py-[6px] text-[12px] text-white leading-snug break-words pointer-events-none"
        >
          {content}
          <div className="absolute top-full left-[12px] border-4 border-transparent border-t-info" />
        </div>
      )}
    </div>
  );
};
