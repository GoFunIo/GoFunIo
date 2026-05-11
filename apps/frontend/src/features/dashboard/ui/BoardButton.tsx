import classNames from 'classnames';
import { Plus, SquarePen, Trash2 } from 'lucide-react';

type Props = {
  children: React.ReactNode;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  type?: 'button' | 'submit' | 'reset';
  size?: 'small' | 'big';
  variant?: 'default' | 'outline' | 'danger';
  icon?: 'add' | 'edit' | 'delete';
  className?: string;
  disabled?: boolean;
};

export const BoardButton = ({
  children,
  onClick,
  type = 'button',
  size = 'big',
  variant = 'default',
  icon,
  className,
  disabled,
}: Props) => {
  const mainBtn = `
    custom-transition hover:shadow-[0_3px_13px_0_rgba(0,0,0,0.2)] cursor-pointer w-fit font-semibold flex shrink-0 items-center justify-center gap-[8px]
  `;
  const smallBtn = `
    h-[30px] min-w-[100px] px-[12px] text-[12px]/[100%] rounded-[3px]
  `;
  const bigBtn = `
    sm:h-[50px] h-[30px] 
    sm:min-w-[190px] min-w-[100px] 
    sm:px-[35px] px-[12px]
    sm:text-[16px]/[14px] text-[12px]/[100%]
    sm:rounded-[7px] rounded-[3px]
  `;

  const defaultBtn = `
    bg-primary text-white hover:bg-secondary
  `;

  const outlineBtn = `
    bg-white border border-primary text-primary
  `;
  const dangerBtn = `
    bg-alert text-white
  `;

  const disabledBtn = `
    pointer-events-none opacity-50 cursor-default
  `;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={classNames(mainBtn, className, {
        [defaultBtn]: variant === 'default',
        [outlineBtn]: variant === 'outline',
        [dangerBtn]: variant === 'danger',
        [smallBtn]: size === 'small',
        [bigBtn]: size === 'big',
        [disabledBtn]: disabled,
      })}
    >
      {icon && icon === 'add' && <Plus size={20} />}
      {icon && icon === 'edit' && <SquarePen size={18} />}
      {icon && icon === 'delete' && <Trash2 size={18} />}
      {children}
    </button>
  );
};
