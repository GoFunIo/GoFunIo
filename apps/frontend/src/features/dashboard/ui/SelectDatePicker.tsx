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
  const OFFSET = 4;

  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedOptionRef = useRef<HTMLButtonElement>(null);

  const selected = options?.find((item) => String(item.value) === String(value));

  const updatePosition = () => {
    if (!buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const menuHeight = menuRef.current?.getBoundingClientRect().height ?? 200;

    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < menuHeight + OFFSET;

    setPosition({
      top: openUp ? rect.top - menuHeight - OFFSET : rect.bottom + OFFSET,
      left: rect.left,
      width: rect.width,
    });
  };

  useLayoutEffect(() => {
    if (!isOpen) return;

    updatePosition();
    selectedOptionRef.current?.scrollIntoView({ block: 'center' });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setIsOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
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
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={ariaLabel}
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex h-8 min-w-15 items-center gap-1 rounded-md border border-icon bg-bg-card px-2 text-[12px] font-bold text-content-secondary"
      >
        {selected?.label}
        <ChevronDown size={14} />
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            minWidth: position.width,
            zIndex: 9999,
          }}
          className="scrollbar-dashboard max-h-50 overflow-y-auto rounded-md border border-icon bg-bg-card shadow-lg"
        >
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
                    'bg-bg-section font-semibold text-content-primary': isSelected,
                    'cursor-not-allowed opacity-50': item.disabled,
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
