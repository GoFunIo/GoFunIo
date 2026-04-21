import classNames from 'classnames';

type Props = {
  children: React.ReactNode;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  variant?: 'default' | 'outline';
  style?: React.CSSProperties;
};

export const Button = ({
  children,
  onClick,
  type = 'button',
  disabled = false,
  variant = 'default',
  style,
}: Props) => {
  const mainButtonStyles = `
    min-w-[190px] w-fit min-h-[50px] rounded-[7px] px-[8px]
    text-[16px] leading-[14px] font-semibold text-center
    cursor-pointer custom-transition
    hover:shadow-[0_3px_13px_0_rgba(0,0,0,0.2)]
  `;
  const defaultButtonStyles = `
    bg-primary hover:bg-secondary text-white
  `;
  const outlineButtonStyles = `
    bg-white text-primary hover:text-secondary
    border border-primary hover:border-secondary
  `;
  const disabledButtonStyles = `
    pointer-events-none opacity-50 cursor-default
  `;

  return (
    <button
      onClick={onClick}
      type={type}
      disabled={disabled}
      className={classNames(mainButtonStyles, {
        [defaultButtonStyles]: variant === 'default',
        [outlineButtonStyles]: variant === 'outline',
        [disabledButtonStyles]: disabled,
      })}
      style={style}
    >
      {children}
    </button>
  );
};
