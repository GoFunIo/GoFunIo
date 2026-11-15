import classNames from 'classnames';
import { ChevronUp, Pencil, Trash2, Check, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

type Value = string | number | null;

type Option = {
  id: string | number;
  value: Value;
  label: string;
  disabled?: boolean;
  builtIn?: boolean;
};

type Props = {
  options: Option[];
  value: Value;
  onChange: (value: Value) => void;
  onEdit?: (option: Option) => void;
  onDelete?: (option: Option) => void;
  placeholder?: string;
  clearOption?: boolean;
  className?: string;
  error?: string;
  disabled?: boolean;
  customInput?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
};

export const Select = ({
  options = [],
  value,
  onChange,
  onEdit,
  onDelete,
  placeholder = 'Wybierz jedno',
  clearOption = true,
  className,
  error,
  disabled = false,
  customInput,
}: Props) => {
  const OFFSET = 6;

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editLabel, setEditLabel] = useState('');

  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  const selectRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const editInputRef = useRef<HTMLInputElement | null>(null);

  const selected =
    options.find((item) => item.value === value) ??
    (customInput?.value.trim() && value === customInput.value
      ? {
          id: 'custom',
          value: customInput.value,
          label: customInput.value,
        }
      : undefined);

  const handleSelect = (newValue: Value) => {
    onChange(newValue);
    setIsOpen(false);
  };

  const handleStartEdit = (option: Option) => {
    setEditingId(option.id);
    setEditLabel(option.label);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditLabel('');
  };

  const handleConfirmEdit = (option: Option) => {
    const label = editLabel.trim();

    if (!label || label === option.label) {
      handleCancelEdit();
      return;
    }

    onEdit?.({
      ...option,
      label,
    });

    handleCancelEdit();
  };

  useEffect(() => {
    if (editingId !== null) {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }
  }, [editingId]);

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target;

      if (!(target instanceof Node)) return;

      if (selectRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }

      setIsOpen(false);
      handleCancelEdit();
    };

    document.addEventListener('pointerdown', handlePointerDown, true);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
    };
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
  }, [isOpen, options.length, editingId]);

  return (
    <div
      ref={selectRef}
      className={classNames('relative w-full', className, {
        'opacity-50 cursor-none pointer-events-none': disabled,
      })}
    >
      <button
        type="button"
        disabled={disabled}
        className={classNames(
          'flex h-[45px] w-full cursor-pointer items-center justify-between rounded-[7px] border bg-bg-card px-[8px] outline-none',
          error ? 'border-alert' : 'border-icon',
          {
            'opacity-60 cursor-not-allowed pointer-events-none': disabled,
          },
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
        !disabled &&
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
                onMouseDown={() => handleSelect(null)}
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

            {options
              .filter((item) => !item.disabled)
              .map((item) => (
                <div
                  key={item.id}
                  className={classNames(
                    'flex items-center justify-between gap-2 rounded-[5px] text-[14px] text-content-secondary hover:bg-bg-section hover:text-content-primary',
                    {
                      'bg-bg-section text-content-primary': item.value === value,
                    },
                  )}
                >
                  {editingId === item.id ? (
                    <>
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleConfirmEdit(item);
                          }

                          if (e.key === 'Escape') {
                            handleCancelEdit();
                          }
                        }}
                        className="min-w-0 flex-1 rounded-[5px] border border-icon bg-bg-card px-2 py-[7px] text-[14px] text-content-primary outline-none focus:border-info"
                      />

                      <div
                        className="flex shrink-0 items-center gap-1 pr-2"
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          aria-label="Zatwierdź zmianę"
                          disabled={!editLabel.trim()}
                          onClick={() => handleConfirmEdit(item)}
                          className="cursor-pointer rounded p-1 text-success disabled:opacity-40"
                        >
                          <Check size={16} />
                        </button>

                        <button
                          type="button"
                          aria-label="Anuluj edycję"
                          onClick={handleCancelEdit}
                          className="cursor-pointer rounded p-1 text-secondary"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span
                        onMouseDown={() => handleSelect(item.value)}
                        className="min-w-0 flex-1 cursor-pointer p-[8px]"
                      >
                        {item.label}
                      </span>

                      {!item.builtIn && (
                        <div
                          className="flex shrink-0 items-center gap-1 pr-2"
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          {onEdit && (
                            <button
                              type="button"
                              aria-label={`Edytuj ${item.label}`}
                              onClick={() => handleStartEdit(item)}
                              className="cursor-pointer rounded p-1 text-secondary"
                            >
                              <Pencil size={15} />
                            </button>
                          )}

                          {onDelete && (
                            <button
                              type="button"
                              aria-label={`Usuń ${item.label}`}
                              onClick={() => onDelete(item)}
                              className="cursor-pointer rounded p-1 text-alert"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}

            {customInput && (
              <div
                className="mt-1 border-t border-icon pt-2"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <input
                  type="text"
                  value={customInput.value}
                  placeholder={customInput.placeholder ?? 'Wpisz nowy typ'}
                  onChange={(e) => customInput.onChange(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full rounded-[5px] border border-icon bg-bg-card px-3 py-2 text-[14px] text-content-primary outline-none focus:border-info"
                />
              </div>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
};
