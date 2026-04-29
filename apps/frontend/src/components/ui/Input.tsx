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
}: Props) => {
  const hasError = Boolean(error);

  const mainInputStyles = `
    w-full min-h-[45px] rounded-[7px] px-[16px] border
    text-[12px] font-medium text-icon 
    focus:outline-none focus:ring-0
    placeholder:text-icon
  `;

  return (
    <div className={classNames('relative w-full pt-5.5', className)}>
      {(label || hasError) && (
        <div className="absolute top-0 left-0 w-full flex justify-between gap-x-2 flex-wrap items-end">
          {label && (
            <label
              htmlFor={name}
              className={classNames(
                'text-[12px] font-medium leading-[21px]',
                hasError ? 'text-alert' : 'text-content-muted',
              )}
            >
              {label}
            </label>
          )}
          {hasError && <p className="text-alert text-[10px] font-medium">{error}</p>}
        </div>
      )}
      <input
        id={name}
        type={type}
        value={value}
        name={name}
        placeholder={placeholder}
        onChange={onChange}
        className={classNames(mainInputStyles, hasError ? 'border-alert' : 'border-icons')}
      />
    </div>
  );
};
