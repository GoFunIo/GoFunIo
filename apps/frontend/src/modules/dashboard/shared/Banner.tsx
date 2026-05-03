import { BoardButton } from '../ui/BoardButton';
import { Clock, TriangleAlert } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { IconWrapper } from '../ui/IconWrapper';
import classNames from 'classnames';

type Props = {
  className?: string;
  type?: 'info' | 'warning' | 'alert';
  title: string;
  subtitle: string;
};

export const Banner = ({ className, type = 'info', title, subtitle }: Props) => {
  const navigate = useNavigate();

  return (
    <div
      className={classNames(
        'flex sm:flex-nowrap flex-wrap  items-center gap-x-[24px] gap-y-[14px] px-[23px] py-[16px] rounded-[7px] border',
        className,
        {
          'border-info bg-info-bg': type === 'info',
          'border-warning bg-warning-bg': type === 'warning',
          'border-alert bg-alert-bg': type === 'alert',
        },
      )}
    >
      <IconWrapper
        className={classNames({
          '!bg-info-bg-icon': type === 'info',
          '!bg-warning-bg-icon': type === 'warning',
          '!bg-alert-bg-icon': type === 'alert',
        })}
      >
        {type === 'info' && <Clock className={`!text-${type}`} />}
        {type === 'warning' && <Clock className={`!text-${type}`} />}
        {type === 'alert' && <TriangleAlert className={`!text-${type}`} />}
      </IconWrapper>
      <div className="mr-auto">
        <p className="pb-[4px] text-black font-semibold text-[16px]/[21px]">{title}</p>
        <p className="text-black font-regular text-[14px]/[21px]">{subtitle}</p>
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
