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
};

export const Select = ({
  options = [],
  value,
  onChange,
  placeholder = 'Choose one',
  clearOption = true,
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
    <div className="relative min-w-[250px] w-fit h-[35px]" ref={selectRef}>
      <button
        className="flex items-center justify-between cursor-pointer bg-bg-page px-[8px] rounded-[5px] border border-icon w-full h-full"
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
        <div className="flex flex-col gap-[4px] absolute top-[40px] bg-bg-page border border-icon rounded-[5px] p-[8px] w-full shadow-[0_4px_13px_0_rgba(0,0,0,0.1)]">
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
