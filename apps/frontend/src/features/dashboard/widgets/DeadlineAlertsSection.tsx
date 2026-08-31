import { useMemo, useState } from 'react';
import { AddVehicleForm } from '@/features/dashboard/forms/AddVehicleForm';
import { VehicleData } from '@/features/dashboard/types';
import { BoardButton } from '@/features/dashboard/ui/BoardButton';
import { Modal } from '@/features/dashboard/ui/Modal';
import { Reminders } from '@/features/dashboard/widgets/ReminderRow';
import { useVehicle, useVehicles } from '@/features/dashboard/hooks/vehicles.hooks';
import { useAllVehicleAlerts } from '@/features/dashboard/hooks/useVehicleAlerts';
import { Select } from '@/features/dashboard/ui/Select';
import { LoadingIcon } from '@/components/ui/LoadingIcon';

export type AlertFilterType = 'all' | 'inspection' | 'insurance';

export function DeadlineAlertsSection() {
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<AlertFilterType>('all');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [renewCarId, setRenewCarId] = useState<string | null>(null);

  const { data: vehiclesResponse } = useVehicles();
  const vehicles: VehicleData[] = vehiclesResponse?.items ?? [];
  const { data: selectedRenewCar } = useVehicle(renewCarId ?? '');

  const carOptions = useMemo(
    () =>
      vehicles.map((car) => ({
        id: car.id,
        label: `${car.brand} ${car.model} · ${car.registrationNumber}`,
        value: car.id,
      })),
    [vehicles],
  );

  const alertsParams = useMemo(() => {
    const params: { vehicleId?: string; overdue?: boolean; limit: number } = { limit: 50 };
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
      <div className="flex justify-between gap-6 items-center flex-wrap mb-6">
        <div className="flex items-center flex-wrap gap-3">
          <h2 className="text-[14px] font-bold text-content-primary mr-3">Typ:</h2>
          <div className="flex gap-3 flex-wrap">
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
            className="sm:ml-[12px]"
          >
            Tylko przeterminowane
          </BoardButton>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-0 justify-end sm:w-fit w-full">
          <h2 className="text-[14px] font-bold text-content-primary mr-4 ">Pojazd:</h2>
          <Select
            value={selectedCarId ?? ''}
            onChange={(value) => setSelectedCarId(value ? String(value) : null)}
            placeholder="-- Wszystkie pojazdy --"
            options={carOptions}
            className="sm:min-w-[320px] "
          />
        </div>
      </div>

      <div>
        {isAlertsPending ? (
          <LoadingIcon className="m-auto my-6" />
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
