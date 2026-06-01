import classNames from 'classnames';
import { CheckCircle2, AlertCircle, AlertTriangle, X } from 'lucide-react';
import { useEffect } from 'react';

type Props = {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  variant?: 'success' | 'error' | 'warning';
  duration?: number;
  className?: string;
};

export const NotificationBanner = ({
  message,
  isVisible,
  onClose,
  variant = 'success',
  duration = 20000,
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

  const Icon = {
    success: CheckCircle2,
    error: AlertCircle,
    warning: AlertTriangle,
  }[variant];

  return (
    <div
      className={classNames(
        'fixed top-[80px] right-[24px] z-[9999]',
        'flex items-center gap-[12px] px-[44px] py-[24px] rounded-[6px] border',
        'shadow-[0_4px_12px_0_rgba(0,0,0,0.05)]',
        'animate-in fade-in slide-in-from-top-2 duration-200',

        {
          // SUKCES (Zielony)
          'bg-success-bg border-success-bg-icon text-success': variant === 'success',

          // BŁĄD / ALERT (Czerwony)
          'bg-alert-bg border-alert-bg-icon text-alert': variant === 'error',

          // OSTRZEŻENIE (Pomarańczowy / Żółty)
          'bg-warning-bg border-warning-bg-icon text-warning': variant === 'warning',
        },
        className,
      )}
    >
      <Icon size={18} className="shrink-0" />

      <span className="text-[16px] font-medium whitespace-nowrap">{message}</span>

      <button
        onClick={onClose}
        className="hover:opacity-70 p-[2px] rounded-[3px] transition-colors duration-150 cursor-pointer ml-[4px]"
      >
        <X size={14} />
      </button>
    </div>
  );
};
