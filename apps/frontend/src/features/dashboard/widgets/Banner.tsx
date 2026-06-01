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

  return (
    <div
      className={classNames(
        'flex sm:flex-nowrap flex-wrap  items-center gap-x-[24px] gap-y-[14px] px-[23px] py-[16px] rounded-[7px] border',
        border,
        bg,
        className,
      )}
    >
      <IconWrapper variant={variant}>
        {variant === 'alert' ? <TriangleAlert /> : <Clock />}
      </IconWrapper>
      <div className="mr-auto">
        <p className="pb-[4px] text-content-primary font-semibold text-[16px]/[21px]">{title}</p>
        <p className="text-content-secondary font-normal text-[14px]/[21px]">{subtitle}</p>
      </div>
      <BoardButton
        onClick={() => navigate({ to: '/dashboard/payments' })}
        size="small"
        className=""
      >
        Aktywuj plan
      </BoardButton>
    </div>
  );
};
