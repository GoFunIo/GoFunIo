import classNames from 'classnames';
import { CheckCircle2, X } from 'lucide-react';
import { useEffect } from 'react';

type Props = {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
  className?: string;
};

export const NotificationBanner = ({
  message,
  isVisible,
  onClose,
  duration = 5000,
  className,
}: Props) => {
  useEffect(() => {
    if (!isVisible) return;

    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  return (
    <div
      className={classNames(
        'absolute top-[80px] right-[24px] z-10]',
        'flex items-center gap-[12px] px-[44px] py-[24px] rounded-[6px]',
        'shadow-[0_4px_12px_0_rgba(0,0,0,0.05)]',
        'animate-in fade-in slide-in-from-top-2 duration-200',

        'bg-success-bg border border-success-bg',
        className,
      )}
    >
      <CheckCircle2 size={18} className="text-success shrink-0" />

      <span className="text-[16px] font-medium text-success whitespace-nowrap">{message}</span>

      <button
        onClick={onClose}
        className="text-success hover:opacity-80 p-[2px] rounded-[3px] transition-colors duration-150 cursor-pointer ml-[4px]"
      >
        <X size={14} />
      </button>
    </div>
  );
};
