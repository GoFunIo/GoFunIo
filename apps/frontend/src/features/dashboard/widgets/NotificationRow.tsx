import classNames from 'classnames';
import {
  Archive,
  CalendarCog,
  CheckCheck,
  LucideIcon,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { BoardButton } from '@/features/dashboard/ui/BoardButton';
import { DeadlineKind, NotificationItem } from '@/features/dashboard/types';
import {
  deadlineKindLabels,
  formatPlDate,
  getLeadDayLabel,
  notificationCategoryLabels,
} from '@/utils/formatDeadline';

const notificationIcons: Record<DeadlineKind, LucideIcon> = {
  TECHNICAL_INSPECTION: CalendarCog,
  AC: ShieldCheck,
  OC: ShieldAlert,
};

const formatDateTime = (isoString: string) => {
  try {
    return new Intl.DateTimeFormat('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
};

type Props = {
  item: NotificationItem;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onRowClick: (item: NotificationItem) => void;
  onMarkAsRead: (id: string) => void;
  onArchive: (id: string) => void;
};

export function NotificationRow({
  item,
  isSelected,
  onToggleSelect,
  onRowClick,
  onMarkAsRead,
  onArchive,
}: Props) {
  const Icon = notificationIcons[item.deadlineKind];
  const isUnread = !item.readAt;
  const isArchived = !!item.archivedAt;

  return (
    <div
      onClick={() => onRowClick(item)}
      className={classNames(
        'flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-[7px] border cursor-pointer transition-colors shadow-sm',
        isSelected
          ? 'border-primary bg-info-bg dark:bg-bg-card'
          : isUnread
            ? 'bg-info-bg border-info dark:bg-bg-card'
            : 'bg-bg-card border-icon',
      )}
    >
      <div className="flex items-center gap-3 shrink-0">
        <input
          type="checkbox"
          checked={isSelected}
          onClick={(e) => e.stopPropagation()}
          onChange={() => onToggleSelect(item.id)}
          className="w-[16px] h-[16px] accent-primary cursor-pointer shrink-0"
        />

        <div
          className={classNames(
            'relative w-[40px] h-[40px] rounded-[3px] flex items-center justify-center shrink-0',
            isUnread ? 'bg-info-bg-icon text-info' : 'bg-bg-section text-content-secondary',
          )}
        >
          {isUnread && (
            <span className="absolute -top-[2px] -right-[2px] w-[8px] h-[8px] bg-alert rounded-full" />
          )}
          <Icon size={20} />
        </div>
      </div>

      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <p
          className={classNames(
            'text-[14px] truncate',
            isUnread ? 'font-bold text-content-primary' : 'font-medium text-content-secondary',
          )}
        >
          {deadlineKindLabels[item.deadlineKind]}
          <span className="text-content-secondary font-normal">
            {' · '}
            {item.vehicle ? (
              <>
                {item.vehicle.brand} {item.vehicle.model} · {item.vehicle.registrationNumber}
              </>
            ) : item.registrationNumber ? (
              item.registrationNumber
            ) : (
              'Brak danych pojazdu'
            )}
          </span>
        </p>
        <p className="text-[12px] text-content-secondary">
          Termin: {formatPlDate(item.deadlineDate)} · {getLeadDayLabel(item.leadDay)} ·{' '}
          {notificationCategoryLabels[item.category]}
        </p>
        <p className="text-[12px] text-content-secondary">
          Utworzono: {formatDateTime(item.createdAt)}
        </p>
      </div>

      <div className="flex flex-col min-[425px]:flex-row min-[425px]:items-center gap-2 shrink-0 sm:ml-auto">
        {isUnread && !isArchived && (
          <BoardButton
            size="small"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onMarkAsRead(item.id);
            }}
          >
            <CheckCheck size={14} className="shrink-0" />
            Przeczytane
          </BoardButton>
        )}
        {!isArchived && (
          <BoardButton
            size="small"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onArchive(item.id);
            }}
          >
            <Archive size={14} className="shrink-0" />
            Archiwizuj
          </BoardButton>
        )}
      </div>
    </div>
  );
}
