import { useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import { ChevronUp } from 'lucide-react';
import { DayPicker } from '@daypicker/react';
import { pl } from '@daypicker/react/locale';

type Props = {
  value: Date | undefined;
  onChange: (value: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  isRenewalMode?: boolean;
};

const formatWeekdayName = (date: Date) => {
  const days = ['pn', 'wt', 'śr', 'czw', 'pt', 'sob', 'nd'];
  return days[date.getDay() === 0 ? 6 : date.getDay() - 1];
};

export const DatePicker = ({
  value,
  onChange,
  placeholder = 'dd.mm.rrrr',
  className,
  isRenewalMode = false,
}: Props) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const selectRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (selectRef.current && selectRef.current.contains(e.target as Node)) {
        return;
      }

      setIsOpen(false);
    };

    document.addEventListener('mousedown', close, true);

    return () => {
      document.removeEventListener('mousedown', close, true);
    };
  }, []);

  return (
    <div className={classNames('relative min-w-[250px] w-fit h-[45px]', className)} ref={selectRef}>
      <div className="relative flex items-center justify-between bg-bg-card rounded-[5px] border border-icon w-full h-full">
        <input
          readOnly
          value={value ? value.toLocaleDateString('pl-PL') : ''}
          placeholder={placeholder}
          type="text"
          className={classNames(
            'caret-transparent text-[14px] focus:outline-none placeholder:text-icon z-9 cursor-pointer px-[8px] w-full h-full',
            {
              'text-content-primary font-medium': !!value,
              'text-content-secondary': !value,
            },
          )}
          onClick={() => setIsOpen((prev) => !prev)}
        />
        {!isRenewalMode && (
          <ChevronUp
            size={20}
            className={classNames('absolute right-2 text-content-secondary transition-transform', {
              'rotate-180': isOpen,
            })}
          />
        )}
      </div>
      {!isRenewalMode && isOpen && (
        <div className="z-99 flex flex-col gap-[4px] absolute top-[50px] bg-bg-card border border-icon rounded-[5px] p-[8px] w-full shadow-[0_4px_13px_0_rgba(0,0,0,0.1)]">
          <DayPicker
            mode="single"
            selected={value}
            locale={pl}
            formatters={{
              formatWeekdayName,
            }}
            onSelect={(date) => {
              onChange(date);
              setIsOpen(false);
            }}
            classNames={{
              month_caption: 'mb-[12px]',
              month_grid: 'w-full',
              weekday: 'text-content-secondary font-medium text-[12px] uppercase',
              day: 'cursor-pointer text-content-secondary text-center',
              day_button:
                'rounded-[6px] cursor-pointer p-[8px] text-[14px] hover:text-content-primary hover:bg-bg-section w-full',
              caption_label: 'text-[14px] font-semibold text-content-secondary',
              nav: 'absolute top-2 right-2',
              chevron: `fill-secondary cursor-pointer w-[16px]`,
              selected: 'rounded-[6px] bg-bg-section text-dark',
            }}
          />
        </div>
      )}
    </div>
  );
};
