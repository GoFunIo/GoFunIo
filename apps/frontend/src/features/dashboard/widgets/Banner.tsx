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
};

export const Banner = ({ variant = 'info', title, subtitle, className }: Props) => {
  const navigate = useNavigate();
  const { border, bg } = getVariantStyles(variant);

  const buttonText = variant === 'info' ? 'Zmień plan' : 'Aktywuj plan';

  return (
    <div
      className={classNames(
        'w-full flex sm:flex-nowrap flex-wrap items-center gap-x-[24px] gap-y-[14px] px-[23px] py-[16px] rounded-[7px] border custom-transition',
        border,
        bg,
        className,
      )}
    >
      <IconWrapper variant={variant}>
        {variant === 'alert' ? <TriangleAlert size={18} /> : <Clock size={18} />}
      </IconWrapper>

      <div className="mr-auto min-w-[200px]">
        <p className="pb-[4px] text-content-primary font-semibold text-[16px]/[21px]">{title}</p>
        <p className="text-content-secondary font-normal text-[14px]/[21px]">{subtitle}</p>
      </div>

      <BoardButton
        onClick={() => navigate({ to: '/dashboard/payments' })}
        size="small"
        className="w-full sm:w-auto shrink-0"
      >
        {buttonText}
      </BoardButton>
    </div>
  );
};
