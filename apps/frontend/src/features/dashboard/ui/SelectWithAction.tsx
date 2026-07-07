import classNames from 'classnames';
import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type Option = {
  value: string | number;
  label: string;
  disabled?: boolean;
};

type Props = {
  options: Option[];
  value: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  className?: string;
};

export const SelectWithAction = ({
  options = [],
  value,
  onChange,
  placeholder = '-- Brak przypisania --',
  className,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement | null>(null);

  const selected = options.find((item) => String(item.value) === String(value));
  const hasSavedValue = value !== undefined && value !== null && value !== 'none' && value !== '';

  const handleSelect = (itemValue: string | number, isDisabled?: boolean) => {
    if (isDisabled) return;
    onChange(itemValue);
    setIsOpen(false);
  };

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div
      className={classNames('relative w-full min-w-[250px] max-w-[320px]', className)}
      ref={selectRef}
    >
      <button
        type="button"
        className="flex items-center justify-between cursor-pointer bg-bg-card border border-icon px-[14px] rounded-[3px] w-full h-[40px] outline-none text-content-primary focus:border-info custom-transition"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <p
          className={classNames('text-left text-[14px] truncate pr-4', {
            'text-content-secondary font-semibold': hasSavedValue,
            'text-icon': !hasSavedValue,
          })}
        >
          {selected ? selected.label : placeholder}
        </p>
        <ChevronDown
          size={16}
          className={classNames('text-content-secondary custom-transition shrink-0', {
            'rotate-180': isOpen,
          })}
        />
      </button>

      {isOpen && (
        <div className="scrollbar-dashboard overflow-y-auto max-h-[240px] flex flex-col gap-[4px] absolute mt-[6px] bg-bg-card border border-icon rounded-[3px] p-[8px] w-full shadow-[0_4px_13px_0_rgba(0,0,0,0.1)] z-[99]">
          {options.map((item, index) => {
            const isCurrent = String(item.value) === String(value);

            return (
              <span
                key={`${item.value}-${index}`}
                onClick={() => handleSelect(item.value, item.disabled)}
                className={classNames(
                  'p-[8px] text-[14px] rounded-[3px] truncate text-left',
                  item.disabled
                    ? 'text-icon cursor-not-allowed bg-transparent'
                    : 'cursor-pointer text-content-secondary hover:text-content-primary hover:bg-bg-section custom-transition',
                  {
                    'text-content-primary bg-bg-section font-medium': isCurrent && !item.disabled,
                  },
                )}
              >
                {item.label}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};
