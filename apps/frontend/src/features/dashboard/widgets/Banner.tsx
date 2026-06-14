import { BoardButton } from '../ui/BoardButton';
import { Clock, TriangleAlert } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import classNames from 'classnames';
import { getVariantStyles, Variant } from '@/utils/getVariantStyles';
import { IconWrapper } from '../ui/IconWrapper';

type Props = {
  className?: string;
  variant?: Variant;
  title: string;
  subtitle: string;
  size?: 'small' | 'big';
  showButton?: boolean;
  buttonLabel?: string;
  buttonTo?: string;
};

export const Banner = ({
  variant = 'info',
  title,
  subtitle,
  className,
  size = 'big',
  showButton = true,
  buttonLabel,
  buttonTo = '/dashboard/settings/payments',
}: Props) => {
  const navigate = useNavigate();
  const { border, bg } = getVariantStyles(variant);

  const isSmall = size === 'small';
  const buttonText = buttonLabel ?? (variant === 'info' ? 'Zmień plan' : 'Aktywuj plan');

  return (
    <div
      className={classNames(
        'w-full flex sm:flex-nowrap flex-wrap items-center gap-x-[24px] gap-y-[14px] px-[23px] py-[16px] rounded-[7px] border custom-transition',
        border,
        bg,
        {
          'sm:flex-nowrap flex-wrap gap-y-[14px] px-[23px] py-[16px]': !isSmall,
          'flex-nowrap px-[16px] py-[10px]': isSmall,
        },
        className,
      )}
    >
      <IconWrapper variant={variant}>
        {variant === 'alert' ? <TriangleAlert size={18} /> : <Clock size={18} />}
      </IconWrapper>

      <div className="mr-auto min-w-[200px]">
        <p
          className={classNames('text-content-primary font-semibold truncate', {
            'text-[16px]/[21px] pb-[4px]': !isSmall,
            'text-[14px]/[18px] pb-[2px]': isSmall,
          })}
        >
          {title}
        </p>
        <p
          className={classNames('text-content-secondary font-normal truncate', {
            'text-[14px]/[21px]': !isSmall,
            'text-[12px]/[16px]': isSmall,
          })}
        >
          {subtitle}
        </p>
      </div>

      {showButton && (
        <BoardButton
          onClick={() => navigate({ to: buttonTo })}
          size="small"
          className="w-full sm:w-auto shrink-0"
        >
          {buttonText}
        </BoardButton>
      )}
    </div>
  );
};
