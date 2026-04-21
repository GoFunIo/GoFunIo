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
}: Props) => {
  const hasError = Boolean(error);

  const mainInputStyles = `
    w-full min-h-[45px] rounded-[7px] px-[16px] border
    text-[12px] font-medium text-icon 
    focus:outline-none focus:ring-0
    placeholder:text-icon
  `;

  return (
    <div className="min-w-[240px] w-fit">
      {(label || hasError) && (
        <div className="flex justify-between gap-x-2 flex-wrap items-end">
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
        onChange={(e) => onChange(e.target.value)}
        className={classNames(mainInputStyles, hasError ? 'border-alert' : 'border-primary')}
        style={style}
      />
    </div>
  );
};
