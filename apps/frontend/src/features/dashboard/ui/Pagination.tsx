import classNames from 'classnames';
import { ArrowLeft, ArrowRight } from 'lucide-react';

type Props = {
  className?: string;
};

export const Pagination = ({ className }: Props) => {
  const arrowStyles =
    'md:absolute cursor-pointer flex items-center gap-[8px] text-[14px] font-normal text-dark';
  const currentPage = 1;

  return (
    <div
      className={classNames(
        'relative md:flex-row flex-col flex items-center justify-between gap-[16px]',
        className,
      )}
    >
      <div className="flex gap-[8px] m-auto">
        {[1, 2, 3, 4, 5].map((item) => {
          return (
            <button
              key={item}
              className={classNames(
                'custom-transition text-semibold flex items-center justify-center text-[14px] cursor-pointer border border-icon h-[32px] w-[32px] rounded-[6px] hover:bg-info-bg-icon hover:border-info-bg-icon',
                {
                  'bg-info-bg-icon border-info-bg-icon': item === currentPage,
                },
              )}
            >
              {item}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-[16px]">
        <button className={classNames(arrowStyles, 'left-0')}>
          <ArrowLeft size={18} />
          Poprzedni
        </button>
        <button className={classNames(arrowStyles, 'right-0')}>
          Następny
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};
