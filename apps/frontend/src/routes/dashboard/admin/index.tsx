import { BlockWrapper } from '@/features/dashboard/ui/BlockWrapper';
import { DashboardHeader } from '@/features/dashboard/widgets/DashboardHeader';
import { Reminders } from '@/features/dashboard/widgets/Reminders';
import { mockCars } from '@/store/cars';
import { createFileRoute } from '@tanstack/react-router';
import { CarFront, ShieldAlert, TriangleAlert, Users, Wrench } from 'lucide-react';
import { DashboardCard } from '@/features/dashboard/widgets/DashboardCard';
import { AdminAlertBucket } from '@/features/dashboard/widgets/AdminAlertBucket';
import { calculateDaysToDate } from '@/utils/calculateDaysToDate';

export const Route = createFileRoute('/dashboard/admin/')({
  component: RouteComponent,
});

function RouteComponent() {
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
        subtitle="Alerty, finanse i aktywność w jednym miejscu."
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

      <Reminders data={mockCars} title="Pilne przypomnienia" />
    </>
  );
}
