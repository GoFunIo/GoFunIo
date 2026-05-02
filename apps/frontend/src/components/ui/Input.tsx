import classNames from 'classnames';

type Props = {
  value: string;
  onChange: (value: string) => void;
  name: string;
  type?: React.HTMLInputTypeAttribute;
  label?: string;
  placeholder?: string;
  style?: React.CSSProperties;
  error?: string;
  className?: string;
};

export const Input = ({
  value,
  onChange,
  name,
  type = 'text',
  label,
  placeholder = 'Type me',
  style,
  error,
  className,
}: Props) => {
  const hasError = Boolean(error);
  const showHeader = label || hasError;

  const mainInputStyles = `
    w-full min-h-[45px] rounded-[7px] px-[16px] border
    text-[14px] font-medium  transition-all duration-200
    outline-none focus:ring-0

    bg-white dark:bg-bg-card
    text-content-primary dark:text-white
    placeholder:text-icon
  `;

  return (
    <div className={classNames('relative w-full', showHeader ? 'pt-4' : 'pt-0', className)}>
      {showHeader && (
        <div className="absolute top-0 left-0 w-full flex justify-between gap-x-2 flex-wrap items-end">
          {label && (
            <label
              htmlFor={name}
              className={classNames(
                'text-[14px] font-medium leading-none',
                hasError ? 'text-alert' : 'text-content-secondary ',
              )}
            >
              {label}
            </label>
          )}
          {hasError && (
            <span className="text-alert text-[12px] leading-none font-medium ">{error}</span>
          )}
        </div>
      )}
      <input
        id={name}
        type={type}
        value={value}
        name={name}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={classNames(
          mainInputStyles,
          hasError ? 'border-alert' : 'border-icon',
          className,
        )}
        style={style}
      />
    </div>
  );
};
