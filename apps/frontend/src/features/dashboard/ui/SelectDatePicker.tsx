import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import { ChevronDown } from 'lucide-react';
import { DropdownProps } from '@daypicker/react';

export const SelectDatePicker = ({
  value,
  options,
  onChange,
  'aria-label': ariaLabel,
}: DropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const selectedOptionRef = useRef<HTMLButtonElement | null>(null);

  const selected = options?.find((item) => String(item.value) === String(value));

  useLayoutEffect(() => {
    if (isOpen && selectedOptionRef.current) {
      const timer = setTimeout(() => {
        selectedOptionRef.current?.scrollIntoView({
          block: 'center',
        });
      }, 0);

      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const handleSelect = (newValue: string | number) => {
    onChange?.({
      target: {
        value: String(newValue),
      },
    } as React.ChangeEvent<HTMLSelectElement>);

    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex h-8 min-w-15 items-center gap-1 rounded-md border border-icon bg-bg-card px-2 text-[12px] text-content-secondary font-bold"
      >
        {selected?.label}
        <ChevronDown size={14} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-9 z-50 max-h-50 min-w-15 overflow-y-auto rounded-md border border-icon bg-bg-card shadow-lg text-content-secondary">
          {options?.map((item) => {
            const isSelected = String(item.value) === String(value);

            return (
              <button
                key={item.value}
                ref={isSelected ? selectedOptionRef : null}
                type="button"
                disabled={item.disabled}
                onClick={() => handleSelect(item.value)}
                className={classNames(
                  'block w-full px-3 py-2 text-left text-[12px] hover:bg-bg-section',
                  {
                    'font-semibold bg-bg-section text-content-primary': isSelected,
                    'opacity-50 cursor-not-allowed': item.disabled,
                  },
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
