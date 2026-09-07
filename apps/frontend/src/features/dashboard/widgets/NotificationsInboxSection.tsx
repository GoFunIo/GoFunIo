import { useMemo, useState } from 'react';
import { Archive, CheckCheck, Inbox } from 'lucide-react';
import classNames from 'classnames';

import { NotificationCategory, NotificationItem } from '@/features/dashboard/types';
import { BoardButton } from '@/features/dashboard/ui/BoardButton';
import { EmptyPlaceholder } from '@/features/dashboard/widgets/EmptyPlaceholder';
import { NotificationRow } from '@/features/dashboard/widgets/NotificationRow';
import {
  useNotifications,
  useMarkNotificationAsRead,
  useArchiveNotification,
  useMarkAllNotificationsAsRead,
  useNotificationCenterSummary,
} from '@/features/dashboard/hooks/notificationCenter.hooks';
import { Select } from '@/features/dashboard/ui/Select';
import { LoadingIcon } from '@/components/ui/LoadingIcon';
import { notificationCategoryLabels } from '@/utils/formatDeadline';

type InboxStatusFilter = 'all' | 'unread' | 'archived';

const ALL_CATEGORIES: NotificationCategory[] = [
  'FLEET_DEADLINES',
  'VEHICLE_ACCESS',
  'MEMBERSHIP',
  'SERVICE',
  'PRODUCT',
];

type Props = {
  onNavigateToVehicle: (vehicleId: string) => void;
};

export function NotificationsInboxSection({ onNavigateToVehicle }: Props) {
  const [statusFilter, setStatusFilter] = useState<InboxStatusFilter>('all');
  const [category, setCategory] = useState<NotificationCategory | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkPending, setIsBulkPending] = useState(false);

  const { data: summary } = useNotificationCenterSummary();

  const notificationsParams = useMemo(() => {
    const base: {
      category?: NotificationCategory;
      unread?: boolean;
      archived?: boolean;
      limit: number;
    } = {
      limit: 20,
    };
    if (category) base.category = category;

    if (statusFilter === 'archived') {
      base.archived = true;
    } else if (statusFilter === 'unread') {
      base.unread = true;
      base.archived = false;
    } else {
      base.archived = false;
    }

    return base;
  }, [statusFilter, category]);

  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useNotifications(notificationsParams);

  const markAsReadMutation = useMarkNotificationAsRead();
  const archiveMutation = useArchiveNotification();
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();

  // Spłaszczenie stron do jednej płaskiej listy — iteruje po `items`.
  const items: NotificationItem[] = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data],
  );

  const unreadCount = summary?.unreadNotificationCount ?? 0;

  const categoryOptions = useMemo(
    () =>
      ALL_CATEGORIES.map((cat) => ({
        id: cat,
        value: cat,
        label: notificationCategoryLabels[cat],
      })),
    [],
  );

  const changeStatusFilter = (next: InboxStatusFilter) => {
    setStatusFilter(next);
    setSelectedIds(new Set());
  };

  const changeCategory = (value: string) => {
    setCategory((value as NotificationCategory) || null);
    setSelectedIds(new Set());
  };

  const allVisibleSelected = items.length > 0 && items.every((item) => selectedIds.has(item.id));

  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      if (allVisibleSelected) return new Set();

      const next = new Set(prev);
      items.forEach((item) => next.add(item.id));

      return next;
    });
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);

      if (next.has(id)) next.delete(id);
      else next.add(id);

      return next;
    });
  };

  const handleRowClick = (item: NotificationItem) => {
    if (!item.readAt) {
      markAsReadMutation.mutate(item.id);
    }
    if (item.action.type === 'OPEN_VEHICLE') {
      onNavigateToVehicle(item.action.vehicleId);
    }
  };

  const handleArchive = (id: string) => {
    archiveMutation.mutate(id);
  };

  const handleMarkAsRead = (id: string) => {
    markAsReadMutation.mutate(id);
  };

  // Globalny "oznacz wszystkie jako przeczytane" (POST /notifications/read-all)
  // bez znaczenia czy sa wczytane na stronie
  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate(category ? { category } : undefined);
  };

  // AKCJE ZBIORCZE (checkboxy)
  const runBulkAction = async (ids: string[], action: (id: string) => Promise<unknown>) => {
    setIsBulkPending(true);
    try {
      await Promise.allSettled(ids.map((id) => action(id)));
    } finally {
      setIsBulkPending(false);
      setSelectedIds(new Set());
    }
  };

  // Odfiltrowanie już-przeczytanych ze zbioru zaznaczonych
  const handleBulkMarkAsRead = () => {
    const ids = Array.from(selectedIds).filter((id) => {
      const item = items.find((i) => i.id === id);
      return item && !item.readAt;
    });
    if (ids.length === 0) return;
    runBulkAction(ids, (id) => markAsReadMutation.mutateAsync(id));
  };

  const handleBulkArchive = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    runBulkAction(ids, (id) => archiveMutation.mutateAsync(id));
  };

  const selectedCount = selectedIds.size;

  return (
    <>
      <div className="flex justify-between items-center gap-6 flex-wrap mb-4 border-b border-icon pb-2">
        <div className="flex flex-wrap sm:flex-row items-start gap-3 sm:gap-6 sm:items-center">
          {(
            [
              ['all', 'Wszystkie'],
              ['unread', 'Nieprzeczytane'],
              ['archived', 'Archiwalne'],
            ] as [InboxStatusFilter, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => changeStatusFilter(key)}
              className={classNames(
                'flex items-center gap-2 pb-1 sm:pb-3 pt-1 text-[14px] font-semibold border-b-2 -mb-px custom-transition bg-transparent',
                statusFilter === key
                  ? 'border-primary text-content-primary'
                  : 'border-transparent text-content-secondary hover:text-content-primary',
              )}
            >
              {label}
              {key === 'unread' && unreadCount > 0 && (
                <span
                  className={classNames(
                    'text-[11px] font-bold rounded-full min-w-[20px] h-[20px] px-1.5 flex items-center justify-center',
                    statusFilter === key
                      ? 'bg-primary text-white'
                      : 'bg-bg-section text-content-secondary',
                  )}
                >
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="pb-2 flex flex-col sm:flex-row gap-4 sm:w-fit w-full">
          <BoardButton
            size="medium"
            className="h-[45px]"
            disabled={unreadCount === 0 || markAllAsReadMutation.isPending}
            onClick={handleMarkAllAsRead}
          >
            <CheckCheck size={16} className="shrink-0" />
            Oznacz wszystkie jako przeczytane
          </BoardButton>

          <Select
            value={category ?? ''}
            onChange={(value) => changeCategory(value ? String(value) : '')}
            placeholder="-- Wszystkie typy --"
            options={categoryOptions}
            className="sm:min-w-[320px]"
          />
        </div>
      </div>

      {/* PASEK AKCJI ZBIORCZYCH — widoczny tylko gdy coś zaznaczone */}
      {selectedCount > 0 && (
        <div className="flex items-center justify-between gap-4 flex-wrap bg-bg-section rounded-[7px] px-0 sm:px-4  ">
          <p className="text-[14px] font-medium text-content-primary">
            Zaznaczono: {selectedCount}
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {statusFilter !== 'archived' && (
              <BoardButton
                size="small"
                variant="outline"
                disabled={isBulkPending}
                onClick={handleBulkMarkAsRead}
              >
                <CheckCheck size={14} className="shrink-0" />
                Oznacz jako przeczytane
              </BoardButton>
            )}
            {statusFilter !== 'archived' && (
              <BoardButton
                size="small"
                variant="outline"
                disabled={isBulkPending}
                onClick={handleBulkArchive}
              >
                <Archive size={14} className="shrink-0" />
                Archiwizuj zaznaczone
              </BoardButton>
            )}
            <BoardButton size="small" variant="outline" onClick={() => setSelectedIds(new Set())}>
              Anuluj
            </BoardButton>
          </div>
        </div>
      )}

      {isLoading ? (
        <LoadingIcon className="m-auto my-6" />
      ) : items.length === 0 ? (
        <EmptyPlaceholder
          title="Brak powiadomień do wyświetlenia"
          className="bg-bg-card min-h-[250px]"
          icon={<Inbox size={24} className="text-primary" />}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-3 px-1 py-1 cursor-pointer w-fit select-none">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleSelectAllVisible}
              className="w-4 h-4 accent-primary cursor-pointer"
            />
            <span className="text-[14px] text-content-secondary">Zaznacz wszystkie widoczne</span>
          </label>

          {items.map((item) => (
            <NotificationRow
              key={item.id}
              item={item}
              isSelected={selectedIds.has(item.id)}
              onToggleSelect={toggleSelectOne}
              onRowClick={handleRowClick}
              onMarkAsRead={handleMarkAsRead}
              onArchive={handleArchive}
            />
          ))}

          {hasNextPage && (
            <div className="flex justify-center mt-4">
              <BoardButton
                variant="outline"
                size="small"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? 'Ładowanie…' : 'Załaduj więcej'}
              </BoardButton>
            </div>
          )}
        </div>
      )}
    </>
  );
}
