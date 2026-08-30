// DWIE sekcje (zgodnie z tabelką w specyfikacji: "Pełny Notification Center |
// oba endpointy list | Osobna sekcja alertów i osobna skrzynka Notifications"):
//
//  1) "Alerty terminów"   -> GET /vehicle-deadline-alerts (cursor, filtr: typ, pojazd, overdue)
//  2) "Skrzynka powiadomień" -> GET /notifications (cursor, filtr: kategoria, unread, archived)
//                               + PATCH .../read, PATCH .../archive, POST /notifications/

import { useMemo, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  Archive,
  Bell,
  CalendarCog,
  CheckCheck,
  Inbox,
  LucideIcon,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import classNames from 'classnames';

import { AddVehicleForm } from '@/features/dashboard/forms/AddVehicleForm';
import {
  VehicleData,
  DeadlineKind,
  NotificationCategory,
  NotificationItem,
} from '@/features/dashboard/types';
import { BoardButton } from '@/features/dashboard/ui/BoardButton';
import { Modal } from '@/features/dashboard/ui/Modal';
import { DashboardHeader } from '@/features/dashboard/widgets/DashboardHeader';
import { Reminders } from '@/features/dashboard/widgets/Reminders';
import { EmptyPlaceholder } from '@/features/dashboard/widgets/EmptyPlaceholder';
import { useVehicles } from '@/features/dashboard/hooks/vehicles.hooks';
import { useAllVehicleAlerts } from '@/features/dashboard/hooks/useVehicleAlerts';
import {
  useNotifications,
  useMarkNotificationAsRead,
  useArchiveNotification,
  useMarkAllNotificationsAsRead,
  useNotificationCenterSummary,
} from '@/features/dashboard/hooks/notificationCenter.hooks';
import { Select } from '@/features/dashboard/ui/Select';
import { LoadingIcon } from '@/components/ui/LoadingIcon';
import {
  formatPlDate,
  deadlineKindLabels,
  notificationCategoryLabels,
  getLeadDayLabel,
} from '@/utils/formatDeadline';

export type AlertFilterType = 'all' | 'inspection' | 'insurance';
type SectionTab = 'alerts' | 'inbox';
type InboxStatusFilter = 'all' | 'unread' | 'archived';

export const Route = createFileRoute('/dashboard/alerts/')({
  component: RouteComponent,
});

const notificationIcons: Record<DeadlineKind, LucideIcon> = {
  TECHNICAL_INSPECTION: CalendarCog,
  AC: ShieldCheck,
  OC: ShieldAlert,
};

const ALL_CATEGORIES: NotificationCategory[] = [
  'FLEET_DEADLINES',
  'VEHICLE_ACCESS',
  'MEMBERSHIP',
  'SERVICE',
  'PRODUCT',
];

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

function RouteComponent() {
  const navigate = useNavigate();
  const [section, setSection] = useState<SectionTab>('alerts');

  return (
    <>
      <DashboardHeader
        title="Alerty"
        subtitle="Centrum alertów: przeglądy, ubezpieczenia i powiadomienia."
      />

      {/* PRZEŁĄCZNIK SEKCJI */}
      <div className="flex gap-[12px] mb-6">
        <BoardButton
          size="small"
          variant={section === 'alerts' ? 'default' : 'outline'}
          onClick={() => setSection('alerts')}
        >
          <TriangleAlert size={16} className="shrink-0" />
          Alerty terminów
        </BoardButton>
        <BoardButton
          size="small"
          variant={section === 'inbox' ? 'default' : 'outline'}
          onClick={() => setSection('inbox')}
        >
          <Bell size={16} className="shrink-0" />
          Skrzynka powiadomień
        </BoardButton>
      </div>

      {section === 'alerts' ? (
        <DeadlineAlertsSection />
      ) : (
        <NotificationsInboxSection
          onNavigateToVehicle={(id) =>
            navigate({ to: '/dashboard/my-cars/$carId', params: { carId: id } })
          }
        />
      )}
    </>
  );
}

// =========================================================================
// SEKCJA 1: ALERTY TERMINÓW (GET /vehicle-deadline-alerts)
// =========================================================================
function DeadlineAlertsSection() {
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<AlertFilterType>('all');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [renewCarId, setRenewCarId] = useState<string | null>(null);

  // Lista pojazdów tylko do wypełnienia Selecta filtra — z odpowiednio dużym
  // pageSize, żeby select faktycznie zawierał całą flotę.
  const { data: vehiclesResponse } = useVehicles({ pageSize: 100 });
  const vehicles: VehicleData[] = vehiclesResponse?.items ?? [];
  const selectedRenewCar = vehicles.find((c) => c.id === renewCarId);

  const carOptions = useMemo(
    () =>
      vehicles.map((car, index) => ({
        id: index + 1,
        label: `${car.brand} ${car.model} · ${car.registrationNumber}`,
        value: car.id,
      })),
    [vehicles],
  );

  // Filtr po pojeździe i "tylko przeterminowane" idzie server-side —
  // deadlineKind (insurance = OC+AC łącznie) zostaje po stronie <Reminders>,
  // bo BE przyjmuje tylko jeden enum na raz, a "insurance" to grupa dwóch.
  const alertsParams = useMemo(() => {
    const params: { vehicleId?: string; overdue?: boolean; limit: number } = { limit: 100 };
    if (selectedCarId) params.vehicleId = selectedCarId;
    if (overdueOnly) params.overdue = true;
    return params;
  }, [selectedCarId, overdueOnly]);

  const {
    items: alerts,
    isPending: isAlertsPending,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useAllVehicleAlerts(alertsParams);

  const handleRenewCar = (id: string) => setRenewCarId(id);
  const closeRenewModal = () => setRenewCarId(null);

  return (
    <>
      <div className="flex justify-between gap-[24px] items-center flex-wrap mb-6">
        {/* PRZYCISKI FILTROWANIA PO TYPIE */}
        <div className="flex items-center flex-wrap gap-[12px]">
          <h2 className="text-[14px] font-bold text-content-primary mr-[12px]">Typ:</h2>
          <div className="flex gap-[12px] flex-wrap">
            <BoardButton
              size="small"
              variant={filterType === 'all' ? 'default' : 'outline'}
              onClick={() => setFilterType('all')}
            >
              Wszystkie
            </BoardButton>
            <BoardButton
              size="small"
              variant={filterType === 'inspection' ? 'default' : 'outline'}
              onClick={() => setFilterType('inspection')}
            >
              Przeglądy techniczne
            </BoardButton>
            <BoardButton
              size="small"
              variant={filterType === 'insurance' ? 'default' : 'outline'}
              onClick={() => setFilterType('insurance')}
            >
              Ubezpieczenia
            </BoardButton>
          </div>

          <BoardButton
            size="small"
            variant={overdueOnly ? 'default' : 'outline'}
            onClick={() => setOverdueOnly((prev) => !prev)}
            className="ml-[12px]"
          >
            Tylko przeterminowane
          </BoardButton>
        </div>

        {/* SELECT POJAZDU */}
        <div className="flex items-center justify-end sm:w-fit w-full">
          <h2 className="text-[14px] font-bold text-content-primary mr-[24px]">Pojazd:</h2>
          <Select
            value={selectedCarId ?? ''}
            onChange={(value) => setSelectedCarId(value ? String(value) : null)}
            placeholder="-- Wszystkie pojazdy --"
            options={carOptions}
            className="sm:min-w-[320px] "
          />
        </div>
      </div>

      {/* WIDOK ALERTÓW */}
      <div>
        {isAlertsPending ? (
          <LoadingIcon className="m-auto my-[24px]" />
        ) : (
          <>
            <Reminders alerts={alerts} filterType={filterType} onRenewCar={handleRenewCar} />

            {hasNextPage && (
              <div className="flex justify-center mt-6">
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
          </>
        )}
      </div>

      {/* MODAL: ODNOWIENIE / EDYCJA TERMINÓW POJAZDU */}
      <Modal
        isOpen={renewCarId !== null}
        setIsOpen={(isOpen) => !isOpen && closeRenewModal()}
        title={
          selectedRenewCar
            ? `Edytuj pojazd ${selectedRenewCar.brand} ${selectedRenewCar.model}`
            : 'Edytuj dane pojazdu'
        }
        subtitle="Zaktualizuj ubezpieczenia lub badania techniczne pojazdu."
      >
        <AddVehicleForm
          initialData={selectedRenewCar}
          onClose={closeRenewModal}
          isRenewalMode={true}
        />
      </Modal>
    </>
  );
}

// =========================================================================
// SEKCJA 2: SKRZYNKA NOTIFICATIONS (GET /notifications + read/archive/read-all)
// =========================================================================
function NotificationsInboxSection({
  onNavigateToVehicle,
}: {
  onNavigateToVehicle: (vehicleId: string) => void;
}) {
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

  const items: NotificationItem[] = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data],
  );

  // Wszystkie/Archiwalne nie mają odpowiednika "total" w kontrakcie BE
  // (paginacja kursorowa celowo go nie zwraca) — pokazujemy realną liczbę
  // tylko wtedy, gdy strona jest w pełni załadowana; w innym wypadku wolę
  // nic nie pokazywać niż pokazać mylącą, częściową liczbę.
  const knownAllCount = statusFilter === 'all' && !hasNextPage ? items.length : null;
  const knownArchivedCount = statusFilter === 'archived' && !hasNextPage ? items.length : null;
  const unreadCount = summary?.unreadNotificationCount ?? 0;

  const categoryOptions = useMemo(
    () =>
      ALL_CATEGORIES.map((cat, index) => ({
        id: index + 1,
        value: cat,
        label: notificationCategoryLabels[cat],
      })),
    [],
  );

  // Zmiana zakładki/kategorii = inny zestaw wierszy => zerujemy zaznaczenie,
  // żeby nie "archiwizować" czegoś, czego użytkownik już nie widzi.
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

  const handleArchive = (e: React.MouseEvent, item: NotificationItem) => {
    e.stopPropagation();
    archiveMutation.mutate(item.id);
  };

  const handleMarkAsRead = (e: React.MouseEvent, item: NotificationItem) => {
    e.stopPropagation();
    markAsReadMutation.mutate(item.id);
  };

  // Globalny "oznacz wszystkie jako przeczytane" (POST /notifications/read-all)
  // — działa na WSZYSTKICH Notifications (opcjonalnie zawężony do kategorii),
  // niezależnie od tego, która zakładka/strona jest akurat załadowana.
  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate(category ? { category } : undefined);
  };

  // Zaznaczenie zbiorcze: BE nie ma endpointu "bulk" po liście ID, więc
  // wykonujemy N pojedynczych wywołań PATCH .../read (lub .../archive)
  // równolegle. Funkcjonalnie to samo, czego oczekuje UI z zaznaczaniem.
  const runBulkAction = async (ids: string[], action: (id: string) => Promise<unknown>) => {
    setIsBulkPending(true);
    try {
      await Promise.allSettled(ids.map((id) => action(id)));
    } finally {
      setIsBulkPending(false);
      setSelectedIds(new Set());
    }
  };

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
      {/* NAGŁÓWEK SEKCJI + STAŁY PRZYCISK GLOBALNY */}
      <div className="flex justify-between items-start gap-4 flex-wrap mb-4">
        <div>
          <p className="text-[12px] font-semibold tracking-wide uppercase text-content-secondary mb-1">
            Centrum komunikacji
          </p>
          <p className="text-[14px] text-content-secondary">
            Historia alertów floty — przeglądy, ubezpieczenia i powiadomienia.
          </p>
        </div>

        <BoardButton
          size="small"
          disabled={unreadCount === 0 || markAllAsReadMutation.isPending}
          onClick={handleMarkAllAsRead}
        >
          <CheckCheck size={16} className="shrink-0" />
          Oznacz wszystkie jako przeczytane
        </BoardButton>
      </div>

      {/* TABY STATUSU + FILTR KATEGORII */}
      <div className="flex justify-between items-center gap-[24px] flex-wrap mb-6 border-b border-icon">
        <div className="flex items-center gap-[24px]">
          {(
            [
              ['all', 'Wszystkie', knownAllCount],
              ['unread', 'Nieprzeczytane', unreadCount],
              ['archived', 'Archiwalne', knownArchivedCount],
            ] as [InboxStatusFilter, string, number | null][]
          ).map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              onClick={() => changeStatusFilter(key)}
              className={classNames(
                'flex items-center gap-2 pb-3 pt-1 text-[14px] font-semibold border-b-2 -mb-px custom-transition bg-transparent',
                statusFilter === key
                  ? 'border-primary text-content-primary'
                  : 'border-transparent text-content-secondary hover:text-content-primary',
              )}
            >
              {label}
              {count !== null && count > 0 && (
                <span
                  className={classNames(
                    'text-[11px] font-bold rounded-full min-w-[20px] h-[20px] px-1.5 flex items-center justify-center',
                    statusFilter === key
                      ? 'bg-primary text-white'
                      : 'bg-bg-section text-content-secondary',
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="pb-2">
          <Select
            value={category ?? ''}
            onChange={(value) => changeCategory(value ? String(value) : '')}
            placeholder="-- Wszystkie typy --"
            options={categoryOptions}
            className="sm:min-w-[240px]"
          />
        </div>
      </div>

      {/* PASEK AKCJI ZBIORCZYCH — widoczny tylko gdy coś zaznaczone */}
      {selectedCount > 0 && (
        <div className="flex items-center justify-between gap-4 flex-wrap bg-bg-section rounded-[7px] px-4 py-3 mb-4">
          <p className="text-[13px] font-medium text-content-primary">
            Zaznaczono: {selectedCount}
          </p>
          <div className="flex items-center gap-3">
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
        <LoadingIcon className="m-auto my-[24px]" />
      ) : items.length === 0 ? (
        <EmptyPlaceholder
          title="Brak powiadomień do wyświetlenia"
          className="bg-bg-card min-h-[250px]"
          icon={<Inbox size={24} className="text-primary" />}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {/* ZAZNACZ WSZYSTKIE WIDOCZNE */}
          <label className="flex items-center gap-3 px-1 py-1 cursor-pointer w-fit select-none">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleSelectAllVisible}
              className="w-[16px] h-[16px] accent-primary cursor-pointer"
            />
            <span className="text-[13px] text-content-secondary">Zaznacz wszystkie widoczne</span>
          </label>

          {items.map((item) => {
            const Icon = notificationIcons[item.deadlineKind];
            const isUnread = !item.readAt;
            const isArchived = !!item.archivedAt;
            const isSelected = selectedIds.has(item.id);

            return (
              <div
                key={item.id}
                onClick={() => handleRowClick(item)}
                className={classNames(
                  'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-[7px] border cursor-pointer transition-colors shadow-sm',
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : isUnread
                      ? 'bg-info-bg/40 border-info'
                      : 'bg-bg-card border-icon',
                )}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleSelectOne(item.id)}
                    className="w-[16px] h-[16px] accent-primary cursor-pointer shrink-0"
                  />

                  <div
                    className={classNames(
                      'relative w-[40px] h-[40px] rounded-[6px] flex items-center justify-center shrink-0',
                      isUnread
                        ? 'bg-info-bg-icon text-info'
                        : 'bg-bg-section text-content-secondary',
                    )}
                  >
                    {isUnread && (
                      <span className="absolute -top-[2px] -right-[2px] w-[8px] h-[8px] bg-alert rounded-full" />
                    )}
                    <Icon size={20} />
                  </div>

                  <div className="flex flex-col gap-0.5 min-w-0">
                    <p
                      className={classNames(
                        'text-[14px] truncate',
                        isUnread
                          ? 'font-bold text-content-primary'
                          : 'font-medium text-content-secondary',
                      )}
                    >
                      {deadlineKindLabels[item.deadlineKind]}
                      <span className="text-content-secondary font-normal">
                        {' · '}
                        {item.registrationNumber}
                      </span>
                    </p>
                    <p className="text-[12px] text-content-secondary">
                      Termin: {formatPlDate(item.deadlineDate)} · {getLeadDayLabel(item.leadDay)} ·{' '}
                      {notificationCategoryLabels[item.category]}
                    </p>
                    <p className="text-[11px] text-content-secondary">
                      Utworzono: {formatDateTime(item.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 justify-end">
                  {isUnread && !isArchived && (
                    <BoardButton
                      size="small"
                      variant="outline"
                      onClick={(e) => handleMarkAsRead(e, item)}
                    >
                      <CheckCheck size={14} className="shrink-0" />
                      Przeczytane
                    </BoardButton>
                  )}
                  {!isArchived && (
                    <BoardButton
                      size="small"
                      variant="outline"
                      onClick={(e) => handleArchive(e, item)}
                    >
                      <Archive size={14} className="shrink-0" />
                      Archiwizuj
                    </BoardButton>
                  )}
                </div>
              </div>
            );
          })}

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
