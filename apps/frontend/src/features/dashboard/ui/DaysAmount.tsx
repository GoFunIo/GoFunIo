import { formatDays } from '@/utils/formatDays';
import classNames from 'classnames';

type Props = {
  days: number;
  className?: string;
};

export const DaysAmount = ({ days, className }: Props) => {
  return (
    <span
      className={classNames(
        'w-fit flex items-center justify-center shrink-0 h-[21px] min-w-[52px] px-[8px] rounded-[3px] font-semibold text-[10px]/[100%]',
        {
          'bg-alert text-white': days >= 0 && days < 7,
          'bg-warning text-dark': days >= 7 && days < 28,
          'bg-bg-section text-dark': days >= 28,
        },
        className,
      )}
    >
      {days} {formatDays(days)}
    </span>
  );
};
