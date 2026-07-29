import { useEffect, useRef, useState } from 'react';
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
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const selectRef = useRef<HTMLDivElement | null>(null);

  const currentYear = new Date().getFullYear();

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
      {!isRenewalMode && isOpen && (
        <div className="z-99 flex flex-col gap-[4px] absolute top-[50px] bg-bg-card border border-icon rounded-[5px] p-[8px] w-full h-auto shadow-md">
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
              month_caption: 'flex items-center justify-between gap-2 mb-3',
              dropdowns: 'flex items-center gap-2',

              nav: 'absolute top-4 right-4 flex items-center gap-1 ml-auto ',
              button_previous:
                'flex h-5 w-5 items-center justify-center rounded-md  hover:bg-bg-section',
              button_next:
                'flex h-5 w-5 items-center justify-center rounded-md hover:bg-bg-section',

              weekdays: 'flex',
              weekday:
                'flex h-8 w-8 items-center justify-center text-[12px] font-medium uppercase text-content-secondary',
              week: 'flex',

              day: 'h-8 w-8',
              day_button:
                'flex h-8 w-8 items-center justify-center rounded-md text-sm text-content-secondary hover:bg-bg-section hover:text-content-primary',

              selected: '!bg-bg-section !text-content-primary font-semibold',
              today: 'bg-bg-section rounded-md',
              disabled: 'opacity-30 cursor-not-allowed',
            }}
          />
        </div>
      )}
    </div>
  );
};
