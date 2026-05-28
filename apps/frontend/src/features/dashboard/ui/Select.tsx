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
};

export const Select = ({
  options = [],
  value,
  onChange,
  placeholder = 'Wybierz jedno',
  clearOption = true,
  className,
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

  return (
    <div className={classNames('relative min-w-[250px] w-fit h-[35px]', className)} ref={selectRef}>
      <div className="relative flex items-center justify-between bg-bg-page rounded-[5px] border border-icon w-full h-full">
        <input
          readOnly
          value={selected ? selected.label : ''}
          placeholder={placeholder}
          type="text"
          className="caret-transparent text-[14px] focus:outline-none placeholder:text-content-secondary text-content-secondary z-9 cursor-pointer px-[8px] w-full h-full"
          onClick={() => setIsOpen((prev) => !prev)}
        />
        <ChevronUp
          size={20}
          className={classNames('absolute right-2 text-content-secondary', {
            'rotate-180': isOpen,
          })}
        />
      </div>
      {isOpen && (
        <div className="z-99 flex flex-col gap-[4px] absolute top-[40px] bg-bg-page border border-icon rounded-[5px] p-[8px] w-full shadow-[0_4px_13px_0_rgba(0,0,0,0.1)]">
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
