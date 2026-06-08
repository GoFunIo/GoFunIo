import { BlockWrapper } from '@/features/dashboard/ui/BlockWrapper';
import { DashboardHeader } from '@/features/dashboard/widgets/DashboardHeader';
import { Reminders } from '@/features/dashboard/widgets/Reminders';
import { mockCars } from '@/store/cars';
import { createFileRoute } from '@tanstack/react-router';
import { CarFront, ShieldAlert, TriangleAlert, Users, Wrench } from 'lucide-react';
import { DashboardCard } from '@/features/dashboard/widgets/DashboardCard';
import { AdminAlertBucket } from '@/features/dashboard/widgets/AdminAlertBucket';
import { calculateDaysToDate } from '@/utils/calculateDaysToDate';
import { useState } from 'react';
import { Modal } from '@/features/dashboard/ui/Modal';
import { AddVehicleForm } from '@/features/dashboard/forms/AddVehicleForm';

export const Route = createFileRoute('/dashboard/admin/')({
  component: RouteComponent,
});

function RouteComponent() {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCarId, setSelectedCarId] = useState<number | null>(null);
  const selectedCar = mockCars.find((c) => c.id === selectedCarId);

  const editModalTitle = selectedCar
    ? `Edytuj pojazd ${selectedCar.brand} ${selectedCar.model}`
    : 'Edytuj pojazd';

  const editModalSubtitle =
    'Zaktualizuj dane techniczne, ubezpieczenia lub numery rejestracyjne tego pojazdu.';

  const handleRenewCar = (id: number) => {
    setSelectedCarId(id);
    setIsEditModalOpen(true);
  };

  // TEST - LOGIKA PZREGLĄDÓW
  const inspectionStats = mockCars.reduce(
    (acc, car) => {
      const { days } = calculateDaysToDate(car.technicalInspectionExpiry);

      if (days >= 0 && days <= 7) {
        acc.days7++;
      } else if (days > 7 && days <= 30) {
        acc.days30++;
      } else if (days > 30 && days <= 60) {
        acc.days60++;
      }
      return acc;
    },
    { days7: 0, days30: 0, days60: 0 },
  );

  //  DYNAMICZNA LOGIKA DLA UBEZPIECZEŃ OC / AC
  const insuranceStats = mockCars.reduce(
    (acc, car) => {
      const ocDiff = calculateDaysToDate(car.ocExpiry).days;
      const acDiff = calculateDaysToDate(car.acExpiry).days;

      // Find the closest expiry date for the vehicle
      const nextInsurance = Math.min(ocDiff, acDiff);

      if (nextInsurance >= 0 && nextInsurance <= 7) {
        acc.days7++;
      } else if (nextInsurance > 7 && nextInsurance <= 30) {
        acc.days30++;
      } else if (nextInsurance > 30 && nextInsurance <= 60) {
        acc.days60++;
      }
      return acc;
    },
    { days7: 0, days30: 0, days60: 0 },
  );

  // 3. SUMOWANIE TYLKO PILNYCH ALERTÓW (Czerwone ≤ 7 oraz Pomarańczowe ≤ 30)
  const totalUrgentReminders =
    inspectionStats.days7 + inspectionStats.days30 + insuranceStats.days7 + insuranceStats.days30;

  const adminStats = {
    totalFleetVehicles: mockCars.length,
    activeUsersCount: 2,
    urgentReminders: totalUrgentReminders,
  };

  return (
    <>
      <DashboardHeader
        title="Pulpit floty"
        subtitle="Alerty i aktywność w jednym miejscu."
        button={{
          label: 'Dodaj pojazd',
          onClick: () => setIsModalOpen(true),
        }}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DashboardCard
          title="Pojazdy we flocie"
          value={adminStats.totalFleetVehicles}
          subtitle="aktywne"
          icon={<CarFront size={20} />}
        />

        <DashboardCard
          title="Aktywni użytkownicy"
          value={adminStats.activeUsersCount}
          subtitle="osoby mają pojazdy w systemie"
          icon={<Users size={20} />}
        />

        <DashboardCard
          title="Pilne przypomnienia"
          value={adminStats.urgentReminders}
          subtitle="działania wymagane w ciągu 30 dni"
          icon={<TriangleAlert size={20} />}
          isAlert={true}
        />
      </div>

      <BlockWrapper>
        <div className="mb-6">
          <p className="text-[18px] text-content-primary font-semibold mb-2">Nadchodzące terminy</p>
          <p className="text-[14px] text-content-secondary">
            Liczba pojazdów wymagających uwagi w najbliższym czasie
          </p>
        </div>

        <div className="grid lg:grid-cols-2 grid-cols-1 gap-6">
          <AdminAlertBucket title="Przeglądy techniczne" icon={Wrench} stats={inspectionStats} />

          <AdminAlertBucket
            title="Ubezpieczenia (OC / AC)"
            icon={ShieldAlert}
            stats={insuranceStats}
          />
        </div>
      </BlockWrapper>

      <Reminders data={mockCars} title="Pilne przypomnienia" onRenewCar={handleRenewCar} />

      {/* MODAL 1: DODAJ POJAZD */}
      <Modal
        isOpen={isModalOpen}
        setIsOpen={setIsModalOpen}
        title="Dodaj pojazd"
        subtitle="Wprowadź dane pojazdu. Pola oznaczone * są wymagane."
      >
        <AddVehicleForm onClose={() => setIsModalOpen(false)} />
      </Modal>

      {/* MODAL EDYCJI */}
      <Modal
        isOpen={isEditModalOpen}
        setIsOpen={setIsEditModalOpen}
        title={editModalTitle}
        subtitle={editModalSubtitle}
      >
        <AddVehicleForm initialData={selectedCar} onClose={() => setIsEditModalOpen(false)} />
      </Modal>
    </>
  );
}
