import classNames from 'classnames';
import {
  Activity,
  SquareCheckBig,
  Droplet,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  CalendarCog,
  Cog,
  Pencil,
  Trash2,
} from 'lucide-react';
import { BoardButton } from '../ui/BoardButton';
import { BlockWrapper } from '../ui/BlockWrapper';
import { EmptyPlaceholder } from './EmptyPlaceholder';
import { IconWrapper } from '../ui/IconWrapper';
import { ToOptions, useNavigate } from '@tanstack/react-router';
import { Pagination } from '../ui/Pagination';

type LinkProps = {
  label: string;
  href: ToOptions['to'];
};

type ButtonProps = {
  label: string;
  onClick: () => void;
};

export type HistoryDataItem = {
  id: number;
  vehicleId: string;
  notes: string | null;
  car: string;
  serviceDate: string;
  cost: number;
  servicePlace: string;
  serviceType: 'service' | 'oil' | 'inspection' | 'insurance_ac' | 'insurance_oc' | 'other';
  attachment: null;
};

type Props = {
  title: string;
  link?: LinkProps;
  button?: ButtonProps;
  data?: HistoryDataItem[];
  className?: string;
  onEditClick?: (item: HistoryDataItem) => void;
  onDeleteClick?: (item: HistoryDataItem) => void;
};

const activityIcons = {
  service: SquareCheckBig,
  oil: Droplet,
  inspection: CalendarCog,
  insurance_ac: ShieldCheck,
  insurance_oc: ShieldAlert,
  other: Cog,
};

export const serviceTypeLabels: Record<string, string> = {
  service: 'Pełny serwis',
  oil: 'Wymiana oleju',
  inspection: 'Przegląd techniczny',
  other: 'Inne',
  insurance_ac: 'Ubezpieczenie AC',
  insurance_oc: 'Ubezpieczenie OC',
};

export const History = ({
  title,
  button,
  data = [],
  link,
  onEditClick,
  onDeleteClick,
  className,
}: Props) => {
  const navigate = useNavigate();

  return (
    <BlockWrapper className={classNames('h-fit', className)}>
      <div className="justify-between flex gap-[16px] items-center flex-wrap mb-[32px]">
        <div className="flex gap-[10px] items-center">
          <Activity className="text-secondary" size={20} />
          <h4 className="">{title}</h4>
        </div>
        <div className="flex items-center gap-[16px]">
          {link && (
            <BoardButton size="small" variant="outline" onClick={() => navigate({ to: link.href })}>
              {link?.label}
            </BoardButton>
          )}
          {button && (
            <BoardButton size="small" onClick={button.onClick} icon="add">
              {button?.label}
            </BoardButton>
          )}
        </div>
      </div>

      {!data || data.length === 0 ? (
        <EmptyPlaceholder
          title="Wprowadż pierwszy wpis serwisowy."
          className="min-h-[240px] mt-[16px]"
        />
      ) : (
        <div className=" flex flex-col gap-[16px]">
          <div className="flex flex-col gap-4 mb-4">
            {data.map((item) => {
              const IconComponent = activityIcons[item.serviceType] || HelpCircle;
              const baseLabel = serviceTypeLabels[item.serviceType] || 'Inna aktywność';
              const displayTitle =
                item.serviceType === 'other' && item.notes
                  ? `${baseLabel}: ${item.notes.toLowerCase()}`
                  : baseLabel;

              return (
                <div
                  className=" flex flex-row gap-3 sm:gap-[16px] not-last:pb-[16px] not-last:border-b not-last:border-icon sm:items-center w-full"
                  key={item.id}
                >
                  <IconWrapper className="bg-info-bg text-info shrink-0 rounded-[3px] p-2 ">
                    <IconComponent size={18} strokeWidth={2.2} />
                  </IconWrapper>

                  <div className="flex flex-col md:flex-row gap-4  md:items-center justify-between w-full min-w-0">
                    <div>
                      <p className="text-content-primary text-[14px] font-medium leading-tight mb-[2px]">
                        {displayTitle}
                      </p>
                      <p className="text-[12px] text-content-secondary ">
                        {item.car} · {item.serviceDate}
                      </p>
                    </div>

                    <div className="flex flex-row justify-between items-center gap-4">
                      <div className="sm:text-right sm:ml-auto flex flex-col sm:justify-center">
                        <p className="text-content-primary font-bold text-[14px]">
                          {item.cost.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł
                        </p>
                        <p className="text-[12px] text-content-secondary mt-0.5 sm:mt-0">
                          {item.servicePlace}
                        </p>
                      </div>

                      <div className="flex items-center justify-end gap-3 shrink-0 ">
                        {onEditClick && (
                          <button
                            onClick={() => onEditClick(item)}
                            className=" text-content-secondary hover:text-primary cursor-pointer"
                            title="Edytuj wpis"
                          >
                            <Pencil size={14} strokeWidth={2.5} />
                          </button>
                        )}

                        {onDeleteClick && (
                          <button
                            onClick={() => onDeleteClick(item)}
                            className="text-content-secondary hover:text-alert cursor-pointer"
                            title="Usuń wpis"
                          >
                            <Trash2 size={14} strokeWidth={2.5} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination className="mt-[18px]" />
        </div>
      )}
    </BlockWrapper>
  );
};
