import classNames from 'classnames';
import { ChevronUp } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

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
  placeholder = 'Wybierz jedno',
  clearOption = true,
  className,
  error,
}: Props) => {
  const OFFSET = 6;

  const [isOpen, setIsOpen] = useState(false);

  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  const selectRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const selected = options.find((item) => item.value === value);

  const handleSelect = (value: Value) => {
    onChange(value);
    setIsOpen(false);
  };

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (
        selectRef.current?.contains(e.target as Node) ||
        menuRef.current?.contains(e.target as Node)
      ) {
        return;
      }

      setIsOpen(false);
    };

    document.addEventListener('mousedown', close);

    return () => document.removeEventListener('mousedown', close);
  }, []);

  const updatePosition = () => {
    if (!selectRef.current) return;

    const rect = selectRef.current.getBoundingClientRect();
    const menuHeight = menuRef.current?.getBoundingClientRect().height ?? 240;

    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < menuHeight + OFFSET;

    setPosition({
      top: openUp ? rect.top - menuHeight - OFFSET : rect.bottom + OFFSET,
      left: rect.left,
      width: rect.width,
    });
  };

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
  }, [isOpen, options.length]);

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsOpen(false);
    }
  };

  return (
    <div
      ref={selectRef}
      tabIndex={0}
      onBlur={handleBlur}
      className={classNames('relative w-full', className)}
    >
      <button
        type="button"
        className={classNames(
          'flex h-[45px] w-full cursor-pointer items-center justify-between rounded-[7px] border bg-bg-card px-[8px] outline-none',
          error ? 'border-alert' : 'border-icon',
        )}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <p
          className={classNames(
            'text-left text-[14px]',
            selected ? 'text-content-primary' : 'text-icon',
          )}
        >
          {selected ? selected.label : placeholder}
        </p>

        <ChevronUp
          size={20}
          className={classNames('absolute right-2 text-content-secondary transition', {
            'rotate-180': isOpen,
          })}
        />
      </button>

      {isOpen &&
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
            className="scrollbar-dashboard flex max-h-[240px] flex-col gap-[4px] overflow-y-auto rounded-[5px] border border-icon bg-bg-card p-[8px] shadow-[0_4px_13px_0_rgba(0,0,0,0.1)]"
          >
            {clearOption && (
              <span
                onClick={() => handleSelect(null)}
                className={classNames(
                  'cursor-pointer rounded-[5px] p-[8px] text-[14px] text-content-secondary hover:bg-bg-section hover:text-content-primary',
                  {
                    'bg-bg-section text-content-primary': value == null,
                  },
                )}
              >
                {placeholder}
              </span>
            )}

            {options.map((item) => (
              <span
                key={item.id}
                onClick={() => handleSelect(item.value)}
                className={classNames(
                  'cursor-pointer rounded-[5px] p-[8px] text-[14px] text-content-secondary hover:bg-bg-section hover:text-content-primary',
                  {
                    'bg-bg-section text-content-primary': item.value === value,
                  },
                )}
              >
                {item.label}
              </span>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
};
