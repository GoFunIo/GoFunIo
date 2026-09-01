import { Link, useNavigate } from '@tanstack/react-router';
import { CalendarCog, ChevronRight, LucideIcon, ShieldAlert, ShieldCheck } from 'lucide-react';
import classNames from 'classnames';
import {
  useNotifications,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useNotificationCenterSummary,
} from '@/features/dashboard/hooks/notificationCenter.hooks';
import { DeadlineKind, NotificationItem } from '@/features/dashboard/types';
import {
  deadlineKindLabels,
  formatPlDate,
  getLeadDayLabel,
  getLeadDayVariant,
} from '@/utils/formatDeadline';

interface RemindersDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

const activityIcons: Record<DeadlineKind, LucideIcon> = {
  TECHNICAL_INSPECTION: CalendarCog,
  AC: ShieldCheck,
  OC: ShieldAlert,
};

const getDropdownSubtitleText = (count: number) => {
  if (count === 0) return 'Brak nowych powiadomień';
  if (count === 1) return '1 nowe powiadomienie';

  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;

  if (lastDigit >= 2 && lastDigit <= 4 && !(lastTwoDigits >= 12 && lastTwoDigits <= 14)) {
    return `${count} nowe powiadomienia`;
  }

  return `${count} nowych powiadomień`;
};

export const RemindersDropdown = ({ isOpen, onClose }: RemindersDropdownProps) => {
  const navigate = useNavigate();
  const { data, isLoading } = useNotifications({ archived: false, limit: 20 });
  const { data: summary } = useNotificationCenterSummary();
  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();

  const items: NotificationItem[] = data?.pages[0]?.items ?? [];
  const unreadCount = summary?.unreadNotificationCount ?? 0;

  const handleItemClick = (item: NotificationItem) => {
    if (!item.readAt) {
      markAsReadMutation.mutate(item.id);
    }

    if (item.action.type === 'OPEN_VEHICLE') {
      navigate({
        to: '/dashboard/my-cars/$carId',
        params: { carId: item.action.vehicleId },
      });
    }

    onClose();
  };

  const handleMarkAllAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    markAllAsReadMutation.mutate(undefined);
  };

  if (!isOpen) return null;

  return (
    <div className="shadow-sm flex flex-col p-4 sm:absolute min-[426px]:top-[64px] top-[50px] right-0 bg-bg-card min-w-[320px] sm:w-[460px] w-screen fixed z-50 border border-icon">
      <div className="border-b border-icon pb-3 flex flex-col sm:flex-row items-start justify-between gap-3">
        <div>
          <h3 className="text-[14px] font-bold text-content-primary">Powiadomienia</h3>
          <p className="text-[12px] text-content-secondary font-normal mt-0.5">
            {getDropdownSubtitleText(unreadCount)}
          </p>
        </div>

        <button
          type="button"
          onClick={handleMarkAllAsRead}
          disabled={unreadCount === 0 || markAllAsReadMutation.isPending}
          className="text-[12px] font-semibold text-secondary hover:underline shrink-0 whitespace-nowrap bg-transparent border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:no-underline"
        >
          Oznacz wszystkie jako przeczytane
        </button>
      </div>

      {/* LISTA */}
      <div className="flex flex-col divide-y divide-icon my-1 max-h-[300px] overflow-y-auto">
        {isLoading ? (
          <p className="text-[12px] text-content-secondary p-4 text-center">
            Ładowanie powiadomień…
          </p>
        ) : items.length === 0 ? (
          <p className="text-[12px] text-content-secondary p-4 text-center">
            Brak powiadomień do wyświetlenia.
          </p>
        ) : (
          items.map((item) => {
            const Icon = activityIcons[item.deadlineKind];
            const isUnread = !item.readAt;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleItemClick(item)}
                className="flex items-center justify-between gap-3 py-3 text-left w-full cursor-pointer bg-transparent border-none"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={classNames(
                      'relative flex items-center justify-center w-[36px] h-[36px] rounded-[3px] shrink-0',
                      isUnread ? 'bg-alert-bg text-alert' : 'bg-info-bg text-info',
                    )}
                  >
                    {isUnread && (
                      <span className="absolute -top-[2px] -right-[2px] w-[8px] h-[8px] bg-alert rounded-full" />
                    )}
                    <Icon size={18} />
                  </div>

                  <div className="flex flex-col min-w-0">
                    <p
                      className={classNames(
                        'text-[14px] truncate',
                        isUnread
                          ? 'font-bold text-content-primary'
                          : 'font-medium text-content-secondary',
                      )}
                    >
                      {deadlineKindLabels[item.deadlineKind]}
                    </p>
                    <p className="text-[12px] text-content-secondary font-normal truncate">
                      {item.registrationNumber}
                    </p>
                    <p className="text-[12px] text-content-secondary font-normal">
                      {formatPlDate(item.deadlineDate)}
                    </p>
                  </div>
                </div>

                <span
                  className={classNames(
                    'text-[11px] font-semibold px-2.5 py-1 rounded-[3px] shrink-0 text-center whitespace-nowrap',
                    {
                      'bg-alert text-white': getLeadDayVariant(item.leadDay) === 'alert',
                      'bg-warning text-white': getLeadDayVariant(item.leadDay) === 'warning',
                      'bg-info text-white': getLeadDayVariant(item.leadDay) === 'info',
                    },
                  )}
                >
                  {getLeadDayLabel(item.leadDay)}
                </span>
              </button>
            );
          })
        )}
      </div>

      <div className="pt-3 border-t border-icon">
        <Link
          onClick={onClose}
          to="/dashboard/alerts"
          className="text-[14px] font-bold text-secondary hover:underline flex items-center justify-between w-full"
        >
          <span>Zobacz wszystkie powiadomienia</span>
          <ChevronRight size={18} className="text-secondary" />
        </Link>
      </div>
    </div>
  );
};
