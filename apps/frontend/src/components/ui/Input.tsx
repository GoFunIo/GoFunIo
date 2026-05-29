import classNames from 'classnames';

type Props = {
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  name: string;
  type?: React.HTMLInputTypeAttribute;
  label?: string;
  placeholder?: string;
  className?: string;
  error?: string;
  errorStyle?: string;
};

export const Input = ({
  value,
  onChange,
  name,
  type = 'text',
  label,
  placeholder = 'Type me',
  className,
  error,
  errorStyle,
}: Props) => {
  const hasError = Boolean(error);

  const mainInputStyles = `
    w-full min-h-[45px] rounded-[7px] px-[16px] border
    text-[14px] font-medium focus:border-info custom-transition
    outline-none focus:ring-0

    bg-white dark:bg-bg-card
    text-content-primary dark:text-white
    placeholder:text-icon
  `;

  return (
    <div className={classNames('relative w-full')}>
      <div
        className={classNames(
          'min-h-[14px] mb-[8px] w-full flex justify-between items-end gap-x-2',
        )}
      >
        <label
          htmlFor={name}
          className={classNames(
            'shrink-0 text-[14px] font-medium leading-none',
            hasError ? 'text-alert' : 'text-content-secondary ',
          )}
        >
          {label}
        </label>
        <span
          className={classNames(
            'text-right text-alert text-[12px] leading-none font-medium',
            errorStyle,
          )}
        >
          {error}
        </span>
      </div>
      <input
        id={name}
        type={type}
        value={value}
        name={name}
        placeholder={placeholder}
        onChange={onChange}
        className={classNames(
          mainInputStyles,
          className,
          hasError ? 'border-alert' : 'border-icon',
        )}
      />
    </div>
  );
};
