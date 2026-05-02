import { BoardButton } from '../ui/BoardButton';
import { Clock, TriangleAlert } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';

type Props = {
  className?: string;
  type?: 'info' | 'warning' | 'alert';
  title: string;
  subtitle: string;
};

export const Banner = ({ className, type = 'info', title, subtitle }: Props) => {
  const navigate = useNavigate();
  const bannerBg = {
    info: 'bg-info/15',
    warning: 'bg-warning/15',
    alert: 'bg-alert/15',
  };
  const imgBg = {
    info: 'bg-info/20',
    warning: 'bg-warning/20',
    alert: 'bg-alert/20',
  };

  return (
    <div
      className={`flex sm:flex-nowrap flex-wrap  items-center gap-x-[24px] gap-y-[14px] px-[23px] py-[16px] rounded-[7px] border border-${type} ${bannerBg[type]} ${className}`}
    >
      <div
        className={`shrink-0 flex items-center justify-center w-[40px] h-[40px] rounded-[3px] ${imgBg[type]}`}
      >
        {type === 'info' && <Clock className={`text-${type}`} />}
        {type === 'warning' && <Clock className={`text-${type}`} />}
        {type === 'alert' && <TriangleAlert className={`text-${type}`} />}
      </div>
      <div className="">
        <p className="pb-[4px] text-black font-semibold text-[16px]/[21px]">{title}</p>
        <p className="text-black font-regular text-[14px]/[21px]">{subtitle}</p>
      </div>
      <BoardButton
        onClick={() => navigate({ to: '/dashboard/payments' })}
        size="small"
        className="sm:ml-auto"
      >
        Aktywuj plan
      </BoardButton>
    </div>
  );
};
