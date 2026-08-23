import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import classNames from 'classnames';
import { ChevronUp } from 'lucide-react';
import { DayPicker } from '@daypicker/react';
import { pl } from '@daypicker/react/locale';
import { SelectDatePicker } from '../ui/SelectDatePicker';

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

const formatMonthDropdown = (date: Date) => {
  const months = [
    'Sty',
    'Lut',
    'Mar',
    'Kwi',
    'Maj',
    'Cze',
    'Lip',
    'Sie',
    'Wrz',
    'Paź',
    'Lis',
    'Gru',
  ];

  return months[date.getMonth()];
};

export const DatePicker = ({
  value,
  onChange,
  placeholder = 'dd.mm.rrrr',
  className,
  isRenewalMode = false,
}: Props) => {
  const OFFSET = 6;

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

  const selectRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const currentYear = new Date().getFullYear();

  const updatePosition = () => {
    if (!selectRef.current) return;

    const rect = selectRef.current.getBoundingClientRect();
    const menuHeight = menuRef.current?.getBoundingClientRect().height ?? 340;

    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < menuHeight + OFFSET;

    setPosition({
      top: openUp ? rect.top - menuHeight - OFFSET : rect.bottom + OFFSET,
      left: rect.left,
      width: rect.width,
    });
  };

  useEffect(() => {
    const close = (e: MouseEvent) => {
      const target = e.target as Node;

      if (selectRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }

      setIsOpen(false);
    };

    document.addEventListener('mousedown', close, true);

    return () => {
      document.removeEventListener('mousedown', close, true);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  useLayoutEffect(() => {
    if (isOpen) {
      updatePosition();
    }
  }, [isOpen]);

  return (
    <div className={classNames('relative w-full h-[45px]', className)} ref={selectRef}>
      <div className="relative flex items-center justify-between bg-bg-card rounded-[5px] border border-icon w-full h-full">
        <input
          readOnly
          type="text"
          value={value ? value.toLocaleDateString('pl-PL') : ''}
          placeholder={placeholder}
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

      {!isRenewalMode &&
        isOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: position.top,
              left: position.left,
              width: position.width,
              zIndex: 9999,
            }}
            className="flex flex-col gap-[4px] bg-bg-card border border-icon rounded-[5px] p-[8px] h-auto shadow-md"
          >
            <DayPicker
              mode="single"
              locale={pl}
              selected={value}
              onSelect={(date) => {
                onChange(date);
                setIsOpen(false);
              }}
              captionLayout="dropdown"
              navLayout="after"
              startMonth={new Date(currentYear - 20, 0)}
              endMonth={new Date(currentYear + 10, 11)}
              defaultMonth={value || new Date()}
              components={{
                Dropdown: SelectDatePicker,
              }}
              formatters={{
                formatWeekdayName,
                formatMonthDropdown,
              }}
              classNames={{
                month: 'w-full',
                month_grid: 'w-full',
                month_caption: 'flex items-center justify-between gap-2 mb-3',
                dropdowns: 'flex items-center gap-2',
                nav: 'absolute top-4 right-4 flex items-center gap-1 ml-auto ',
                button_previous:
                  'flex h-5 w-5 items-center justify-center rounded-md  hover:bg-bg-section',
                button_next:
                  'flex h-5 w-5 items-center justify-center rounded-md hover:bg-bg-section',
                weekdays: 'flex w-full',
                weekday:
                  'flex h-8 w-full items-center justify-center text-[12px] font-medium uppercase text-content-secondary',
                week: 'flex',
                day: 'h-8 w-full',
                day_button:
                  'flex h-8 w-full items-center justify-center rounded-md text-sm text-content-secondary hover:bg-bg-section hover:text-content-primary',
                selected: '!bg-info-bg-icon !text-content-primary font-semibold',
                today: 'bg-bg-section rounded-md',
                disabled: 'opacity-30 cursor-not-allowed',
              }}
            />
          </div>,
          document.body,
        )}
    </div>
  );
};
