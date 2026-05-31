import classNames from 'classnames';
import { ChevronUp } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type Value = string | number | null;

type Option = {
  id: number;
  value: Value;
  label: string;
};

type Props = {
  options: Option[];
  value: Value;
  onChange: (value: Value) => void;
  placeholder?: string;
  clearOption?: boolean;
  className?: string;
  error?: string;
};

export const Select = ({
  options = [],
  value,
  onChange,
  placeholder = 'Choose one',
  clearOption = true,
  className,
  error,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement | null>(null);
  const selected = options.find((item) => item.value === value);

  const handleSelect = (value: Value) => {
    onChange(value);
    setIsOpen(false);
  };

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (selectRef.current && selectRef.current.contains(e.target as Node)) {
        return;
      }

      setIsOpen(false);
    };

    document.addEventListener('mousedown', close);

    return () => {
      document.removeEventListener('mousedown', close);
    };
  }, []);

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsOpen(false);
    }
  };

  return (
    <div
      className={classNames('relative min-w-[250px] w-fit h-[35px]', className)}
      ref={selectRef}
      tabIndex={0}
      onBlur={handleBlur}
    >
      <button
        type="button"
        className={classNames(
          'flex items-center justify-between cursor-pointer bg-bg-page px-[8px] rounded-[5px] w-full h-full outline-none ',
          error ? 'border border-alert' : 'border border-icon',
        )}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <p className="text-left text-[14px] text-content-secondary">
          {selected ? selected.label : placeholder}
        </p>
        <ChevronUp
          size={20}
          className={classNames('text-content-secondary', {
            'rotate-180': isOpen,
          })}
        />
      </button>
      {isOpen && (
        <div className="scrollbar-dashboard overflow-y-auto max-h-[240px] flex flex-col gap-[4px] absolute mt-[6px] bg-bg-page border border-icon rounded-[5px] p-[8px] w-full shadow-[0_4px_13px_0_rgba(0,0,0,0.1)] z-[99]">
          {clearOption && (
            <span
              onClick={() => handleSelect(null)}
              className={classNames(
                'cursor-pointer p-[8px] text-[14px] text-content-secondary rounded-[5px] hover:text-dark hover:bg-bg-section',
                {
                  'text-dark bg-bg-section': value == null,
                },
              )}
            >
              {placeholder}
            </span>
          )}
          {options.map((item, index) => {
            return (
              <span
                key={`${item.value}-${index}`}
                onClick={() => handleSelect(item.value)}
                className={classNames(
                  'cursor-pointer p-[8px] text-[14px] text-content-secondary rounded-[5px] hover:text-dark hover:bg-bg-section',
                  {
                    'text-dark bg-bg-section': item.value === value,
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
