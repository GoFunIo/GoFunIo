import classNames from 'classnames';
import { Plus, SquarePen, Trash2, ChevronRight, RefreshCcw, ArrowUpRight } from 'lucide-react';

type Props = {
  children?: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  type?: 'button' | 'submit' | 'reset';
  size?: 'small' | 'medium' | 'big' | 'square';
  variant?: 'default' | 'outline' | 'danger';
  icon?: 'add' | 'edit' | 'delete' | 'arrow' | 'refresh' | 'ArrowUpRight';
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
  const isSquare = size === 'square';

  const mainBtn = classNames(
    'custom-transition  font-semibold inline-flex shrink-0 items-center justify-center whitespace-nowrap cursor-pointer disabled:cursor-not-allowed',
    {
      'w-[30px] p-0': isSquare,
      'w-auto gap-[8px]': !isSquare,
    },
  );

  const smallBtn = `
    h-[35px] min-w-[100px] px-[12px] text-[12px]/[100%] rounded-[3px]
  `;
  const mediumBtn = `
    h-[40px] min-w-[100px] px-[12px] text-[12px]/[100%] rounded-[3px]
  `;
  const bigBtn = `
    sm:h-[50px] h-[30px]
    sm:min-w-[190px] min-w-[100px]
    sm:px-[35px] px-[12px]
    sm:text-[16px]/[14px] text-[12px]/[100%]
    sm:rounded-[7px] rounded-[3px]
  `;
  const squareBtn = `
    h-[30px] rounded-[3px]`;

  const defaultBtn = `
    bg-primary text-white hover:bg-secondary not-disabled:hover:shadow-[0_3px_13px_0_rgba(0,0,0,0.2)]
  `;

  const outlineBtn = `
    bg-white border border-primary text-primary not-disabled:hover:shadow-[0_3px_13px_0_rgba(0,0,0,0.2)]
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
        [mediumBtn]: size === 'medium',
        [bigBtn]: size === 'big',
        [squareBtn]: size === 'square',
        [disabledBtn]: disabled,
      })}
    >
      {icon && icon === 'add' && <Plus size={20} />}
      {icon && icon === 'edit' && <SquarePen size={18} />}
      {icon && icon === 'delete' && <Trash2 size={18} />}
      {icon && icon === 'refresh' && <RefreshCcw size={18} />}
      {icon && icon === 'ArrowUpRight' && <ArrowUpRight size={18} />}
      {children}
      {icon && icon === 'arrow' && <ChevronRight size={16} className="shrink-0" />}
    </button>
  );
};
