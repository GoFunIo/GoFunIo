import classNames from 'classnames';
import { ArrowLeft, ArrowRight } from 'lucide-react';

type Props = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
};

export const Pagination = ({ currentPage, totalPages, onPageChange, className }: Props) => {
  const arrowStyles =
    'md:absolute cursor-pointer flex items-center gap-[8px] text-[14px] font-normal text-dark disabled:opacity-40 disabled:cursor-not-allowed';

  if (totalPages <= 1) return null;

  const getVisiblePages = () => {
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  const visiblePages = getVisiblePages();

  return (
    <div
      className={classNames(
        'relative md:flex-row flex-col flex items-center justify-between gap-[16px]',
        className,
      )}
    >
      <div className="flex gap-[8px] m-auto">
        {visiblePages.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            className={classNames(
              'custom-transition text-semibold flex items-center justify-center text-[14px] cursor-pointer border border-icon h-[32px] w-[32px] rounded-[6px] bg-bg-section text-content-primary hover:bg-info-bg-icon hover:border-info-bg-icon hover:dark:text-dark',
              {
                'bg-info-bg-icon border-info-bg-icon text-dark': item === currentPage,
              },
            )}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-[16px]">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className={classNames(arrowStyles, 'left-0')}
        >
          <ArrowLeft size={18} />
          Poprzedni
        </button>
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className={classNames(arrowStyles, 'right-0')}
        >
          Następny
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};
