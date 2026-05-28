import classNames from 'classnames';
import { BlockWrapper } from '../ui/BlockWrapper';
import { BoardButton } from '../ui/BoardButton';
import { AlertTriangle } from 'lucide-react';
import { EmptyPlaceholder } from './EmptyPlaceholder';
import { formatDays } from '@/utils/formatDays';

type Props = {
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any[];
  className?: string;
};

export const Reminders = ({ title, data = [], className }: Props) => {
  return (
    <BlockWrapper className={classNames('h-fit', className)}>
      <div className="flex gap-[10px] items-center">
        <AlertTriangle className="text-alert" size={20} />
        <h4 className="">{title}</h4>
      </div>

      {!data || data.length === 0 ? (
        <EmptyPlaceholder title="Pusto" className="min-h-[240px] mt-[16px]" />
      ) : (
        <div className="mt-[24px] flex flex-col gap-[24px]">
          {data.map((item) => {
            return (
              <div
                key={item.id}
                className={classNames(
                  'gap-[16px] grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 items-start p-[16px] border-l-[5px] rounded-[7px]',
                  {
                    'bg-alert-bg border-alert': item.termin <= 7,
                    'bg-warning-bg border-warning': item.termin > 7,
                  },
                )}
              >
                <div className="">
                  <p className="pb-[8px] text-[14px] text-dark font-bold">
                    {item.car}
                    <span className="text-content-secondary font-normal"> ({item.plate})</span>
                  </p>
                  <p className="text-[12px] text-content-secondary">
                    Przegląd techniczny — termin za {item.termin} {formatDays(item.termin)}
                  </p>
                </div>
                <p
                  className={classNames(
                    'lg:order-none md:order-2 order-0 text-[12px] font-semibold text-white rounded-[3px] h-[30px] min-w-[120px] w-fit flex items-center justify-center',
                    {
                      'bg-alert': item.termin <= 7,
                      'bg-warning': item.termin > 7,
                    },
                  )}
                >
                  {item.termin <= 7 ? 'Krytyczne' : 'Nadchodzące'}
                </p>
                <div className="md:ml-auto flex gap-[16px]">
                  <BoardButton onClick={() => {}} size="small" variant="outline">
                    Ignoruj
                  </BoardButton>
                  <BoardButton onClick={() => {}} size="small">
                    Odnów
                  </BoardButton>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </BlockWrapper>
  );
};
