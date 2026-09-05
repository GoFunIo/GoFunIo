import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import classNames from 'classnames';
import { ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker } from '@daypicker/react';
import { pl } from '@daypicker/react/locale';
import { SelectDatePicker } from '../ui/SelectDatePicker';

type Props = {
  value: Date | undefined;
  onChange: (value: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  isRenewalMode?: boolean;
  clearable?: boolean;
  maxDate?: boolean;
  error?: string;
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
  clearable = false,
  maxDate = false,
  error,
}: Props) => {
  const OFFSET = 6;

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

  const selectRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const currentYear = new Date().getFullYear();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

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
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target;

      if (!(target instanceof Node)) return;

      if (selectRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }

      setIsOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown, true);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
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
      <div
        className={classNames(
          'relative flex items-center justify-between bg-bg-card rounded-[7px] border w-full h-full',
          error ? 'border-alert' : 'border-icon',
        )}
      >
        <input
          readOnly
          type="text"
          value={value ? value.toLocaleDateString('pl-PL') : ''}
          placeholder={placeholder}
          className={classNames(
            'caret-transparent text-[14px] focus:outline-none placeholder:text-icon cursor-pointer px-[8px] w-full h-full',
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
            className={classNames(
              'pointer-events-none absolute right-2 text-content-secondary transition-transform',
              {
                'rotate-180': isOpen,
              },
            )}
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
            {clearable && value && (
              <button
                type="button"
                className="cursor-pointer w-full rounded-md px-2 py-2 text-[13px] font-medium text-content-secondary hover:bg-bg-section hover:text-content-primary"
                onClick={() => {
                  onChange(undefined);
                }}
              >
                Wyczyść datę
              </button>
            )}
            <DayPicker
              mode="single"
              locale={pl}
              selected={value}
              onSelect={(date) => {
                onChange(date);
              }}
              disabled={maxDate ? { after: today } : undefined}
              captionLayout="dropdown"
              navLayout="after"
              startMonth={new Date(currentYear - 20, 0)}
              endMonth={new Date(currentYear + 10, 11)}
              defaultMonth={value || new Date()}
              components={{
                Dropdown: SelectDatePicker,

                Chevron: ({ orientation, ...chevronProps }) =>
                  orientation === 'left' ? (
                    <ChevronLeft size={16} {...chevronProps} />
                  ) : (
                    <ChevronRight size={16} {...chevronProps} />
                  ),
              }}
              formatters={{
                formatWeekdayName,
                formatMonthDropdown,
              }}
              classNames={{
                month: 'w-full relative',
                month_grid: 'w-full',
                month_caption: 'flex items-center justify-between gap-2 mb-3',
                dropdowns: 'flex items-center gap-2',
                nav: 'absolute top-1 right-1 flex items-center text-content-secondary gap-1 ml-auto ',
                button_previous:
                  'flex h-5 w-5 items-center justify-center rounded-md text-content-secondary  hover:bg-bg-section',
                button_next:
                  'flex h-5 w-5 items-center justify-center rounded-md text-content-secondary hover:bg-bg-section',
                weekdays: 'flex w-full',
                weekday:
                  'flex h-8 w-full items-center justify-center text-[12px] font-medium uppercase text-content-secondary',
                week: 'flex',
                day: 'h-8 w-full rounded-md flex items-center justify-center text-sm text-content-secondary hover:bg-bg-section hover:text-content-primary',
                day_button: 'w-full h-full',
                today: 'bg-bg-section',
                selected: 'bg-primary text-white',
                disabled: 'opacity-30 cursor-not-allowed',
              }}
            />
          </div>,
          document.body,
        )}
    </div>
  );
};
