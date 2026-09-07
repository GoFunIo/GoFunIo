import classNames from 'classnames';
import { forwardRef, InputHTMLAttributes } from 'react';

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  errorStyle?: string;
  isValidate?: boolean;
};

export const Input = forwardRef<HTMLInputElement, Props>(
  ({ name, label, placeholder = 'Type me', className, error, errorStyle, ...props }, ref) => {
    const hasError = Boolean(error);
    const isDisabled = props.disabled;

    const mainInputStyles = `
    w-full min-h-[45px] rounded-[7px] px-[16px] border
    text-[14px] font-medium focus:border-info custom-transition
    outline-none focus:ring-0

    bg-bg-card
    text-content-primary
    placeholder:text-icon
  `;

    return (
      <div className={classNames('relative w-full flex flex-col justify-between')}>
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
              { 'opacity-60 select-none': isDisabled },
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
          ref={ref}
          id={name}
          name={name}
          placeholder={placeholder}
          className={classNames(
            mainInputStyles,
            className,
            hasError ? 'border-alert' : 'border-icon',
            {
              'text-content-secondary opacity-60 cursor-not-allowed select-none pointer-events-none':
                isDisabled,
            },
          )}
          {...props}
        />
      </div>
    );
  },
);

Input.displayName = 'Input';
