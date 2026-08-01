import { useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { AddVehicleForm } from '@/features/dashboard/forms/AddVehicleForm';
import { VehicleData } from '@/features/dashboard/types';
import { BoardButton } from '@/features/dashboard/ui/BoardButton';
import { Modal } from '@/features/dashboard/ui/Modal';
import { DashboardHeader } from '@/features/dashboard/widgets/DashboardHeader';
import { Reminders } from '@/features/dashboard/widgets/Reminders';
import { useVehicles } from '@/features/dashboard/hooks/vehicles.hooks';
import { Select } from '@/features/dashboard/ui/Select';
import { LoadingIcon } from '@/components/ui/LoadingIcon';

export type AlertFilterType = 'all' | 'inspection' | 'insurance';

export const Route = createFileRoute('/dashboard/notifications/')({
  component: RouteComponent,
});

function RouteComponent() {
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<AlertFilterType>('all');

  // Stany dla modala edycji / odnowienia pojazdu
  const [renewCarId, setRenewCarId] = useState<string | null>(null);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState<boolean>(false);

  const {
    data: vehiclesResponse,
    isLoading: isVehiclesLoading,
    refetch: refetchVehicles,
  } = useVehicles();
  const vehicles: VehicleData[] = vehiclesResponse?.items ?? [];

  const selectedRenewCar = vehicles.find((c) => c.id === renewCarId);

  const handleRenewCar = (id: string) => {
    setRenewCarId(id);
    setIsRenewModalOpen(true);
  };

  //selector otions
  const carOptions = useMemo(() => {
    return vehicles.map((car, index) => ({
      id: index + 1,
      label: `${car.brand} ${car.model} · ${car.registrationNumber}`,
      value: car.id,
    }));
  }, [vehicles]);

  const filteredVehicles = useMemo(() => {
    if (!selectedCarId) return vehicles;
    return vehicles.filter((car) => car.id === selectedCarId);
  }, [vehicles, selectedCarId]);

  return (
    <>
      <DashboardHeader title="Alerty" subtitle="Centrum alertów: przeglądy i ubezpieczenia." />

      <div className="flex justify-between gap-[24px] items-center flex-wrap mb-6">
        {/* PRZYCISKI FILTROWANIA PO TYPIE */}
        <div className="flex items-center">
          <h2 className="text-[14px] font-bold text-content-primary mr-[24px]">Typ:</h2>
          <div className="flex gap-[18px] flex-wrap">
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
        {isVehiclesLoading ? (
          <LoadingIcon className="m-auto my-[24px]" />
        ) : (
          <Reminders
            data={filteredVehicles}
            filterType={filterType}
            onRenewCar={handleRenewCar}
            maxDays={60}
          />
        )}
      </div>

      {/* MODAL: ODNOWIENIE / EDYCJA TERMINÓW POJAZDU */}
      <Modal
        isOpen={isRenewModalOpen}
        setIsOpen={setIsRenewModalOpen}
        title={
          selectedRenewCar
            ? `Edytuj pojazd ${selectedRenewCar.brand} ${selectedRenewCar.model}`
            : 'Edytuj dane pojazdu'
        }
        subtitle="Zaktualizuj ubezpieczenia lub badania techniczne pojazdu."
      >
        <AddVehicleForm
          initialData={selectedRenewCar}
          onClose={() => setIsRenewModalOpen(false)}
          onSuccess={() => refetchVehicles()}
          isRenewalMode={true}
        />
      </Modal>
    </>
  );
}
