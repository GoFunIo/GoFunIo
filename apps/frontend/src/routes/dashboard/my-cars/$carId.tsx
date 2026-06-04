import { useState } from 'react';
import { BlockWrapper } from '@/features/dashboard/ui/BlockWrapper';
import { BoardButton } from '@/features/dashboard/ui/BoardButton';
import { GridWrapper } from '@/features/dashboard/ui/GridWrapper';
import { IconWrapper } from '@/features/dashboard/ui/IconWrapper';
import { History } from '@/features/dashboard/widgets/History';
import { activityArr, carsArr } from '@/store/cars';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, CalendarCog, CarFront, ShieldAlert, ShieldCheck } from 'lucide-react';
import { AddVehicleForm } from '@/features/dashboard/forms/AddVehicleForm';
import { Modal } from '@/features/dashboard/ui/Modal';
import { DeleteCarConfirm } from '@/features/dashboard/ui/DeleteCarConfirm';
import { DashboardCard } from '@/features/dashboard/widgets/DashboardCard';

export const Route = createFileRoute('/dashboard/my-cars/$carId')({
  loader: ({ params }) => {
    return carsArr.find((b) => String(b.id) === params.carId);
  },
  component: RouteComponent,
});

function RouteComponent() {
  const car = Route.useLoaderData();
  const navigate = useNavigate();

  if (!car) {
    return (
      <div className="p-8 text-center">
        <p className="text-content-secondary">Nie znaleziono takiego pojazdu.</p>
        <Link to="/dashboard/my-cars" className="text-primary mt-2 inline-block hover:underline">
          Wróć do listy pojazdów
        </Link>
      </div>
    );
  }

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const editModalTitle = `Edytuj pojazd ${car.brand} ${car.model}`;
  const editModalSubtitle =
    'Zaktualizuj dane techniczne, ubezpieczenia lub numery rejestracyjne tego pojazdu.';

  const handleDelete = async () => {
    try {
      console.log('Usuwanie pojazdu o ID:', car.id);
      // await axios.delete(`/api/vehicles/${car.id}`);
      setIsDeleteModalOpen(false);
      navigate({ to: '/dashboard/my-cars' });
    } catch (error) {
      console.error('Błąd usuwania:', error);
    }
  };

  return (
    <>
      {/* 1. LINK POWROTNY */}
      <Link
        to="/dashboard/my-cars"
        className="w-fit flex items-center gap-[8px] text-[12px] text-content-secondary"
      >
        <ArrowLeft size={18} />
        Wróć do pojazdów
      </Link>

      {/* 2. NAGŁÓWEK Z DANYMI AUTA  */}
      <div className="grid sm:grid-cols-2 grid-cols-1 gap-[16px]">
        <div className="flex gap-[16px] items-center shrink-0">
          <IconWrapper className="xl:w-[60px] xl:h-[60px] w-[50px] h-[50px]  bg-secondary">
            <CarFront className="text-white" />
          </IconWrapper>
          <div className="">
            <h3 className="pb-[3px]">
              {car.brand} {car.model}
            </h3>
            <p className="text-[14px] text-dark">
              {car.productionYear} - {car.registrationNumber} - {car.fuelType}
            </p>
          </div>
        </div>
        <div className="sm:ml-auto order-1 flex gap-[16px]">
          <BoardButton onClick={() => setIsEditModalOpen(true)} icon="edit" size="small">
            Edytuj
          </BoardButton>
          <BoardButton
            onClick={() => setIsDeleteModalOpen(true)}
            icon="delete"
            variant="danger"
            size="small"
          >
            Usuń
          </BoardButton>
        </div>
      </div>

      {/* 3. SIATKA TRZECH  KAFELKÓW  */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DashboardCard
          title="przegląd"
          value={car.technicalInspectionExpiry || ''}
          icon={<CalendarCog size={20} />}
        />

        <DashboardCard
          title="Ubezpieczenie OC"
          value={car.ocExpiry || ''}
          icon={<ShieldAlert size={20} />}
        />

        <DashboardCard
          title="Ubezpieczenie AC"
          value={car.acExpiry || ''}
          icon={<ShieldCheck size={20} />}
        />
      </div>

      {/* =================
      --------------------
      ------------------- */}

      <GridWrapper layout="2-unequal">
        <History
          data={activityArr}
          button={{
            label: 'Zobacz wszystko',
            onClick: () => {},
          }}
          title="Historia serwisowa"
        />
        <BlockWrapper className="h-fit">
          <h4 className="">Specyfikacja</h4>
          <ul className="py-[16px] border-b border-dark space-y-[10px]">
            <li className="flex gap-[8px] justify-between">
              <p className="text-[14px]">Marka</p>
              <p className="text-[14px] text-black">BMW</p>
            </li>
            <li className="flex gap-[8px] justify-between">
              <p className="text-[14px]">Marka</p>
              <p className="text-[14px] text-black">BMW</p>
            </li>
            <li className="flex gap-[8px] justify-between">
              <p className="text-[14px]">Marka</p>
              <p className="text-[14px] text-black">BMW</p>
            </li>
            <li className="flex gap-[8px] justify-between">
              <p className="text-[14px]">Marka</p>
              <p className="text-[14px] text-black">BMW</p>
            </li>
            <li className="flex gap-[8px] justify-between">
              <p className="text-[14px]">Marka</p>
              <p className="text-[14px] text-black">BMW</p>
            </li>
            <li className="flex gap-[8px] justify-between">
              <p className="text-[14px]">Marka</p>
              <p className="text-[14px] text-black">BMW</p>
            </li>
            <li className="flex gap-[8px] justify-between">
              <p className="text-[14px]">Marka</p>
              <p className="text-[14px] text-black">BMW</p>
            </li>
          </ul>
          <div className="pt-[16px]">
            <h4 className="">Notatki</h4>
            <p className="text-[14px] pt-[8px]">Samochód służbowy</p>
          </div>
        </BlockWrapper>
      </GridWrapper>

      {/* MODAL EDYCJI */}
      <Modal
        isOpen={isEditModalOpen}
        setIsOpen={setIsEditModalOpen}
        title={editModalTitle}
        subtitle={editModalSubtitle}
      >
        <AddVehicleForm initialData={car} onClose={() => setIsEditModalOpen(false)} />
      </Modal>

      {/* MODAL USUWANIA */}
      <Modal
        isOpen={isDeleteModalOpen}
        setIsOpen={setIsDeleteModalOpen}
        title="Usuń pojazd"
        subtitle="Czy na pewno chcesz usunąć ten pojazd z systemu? Ta operacja jest nieodwracalna."
      >
        <DeleteCarConfirm
          car={car}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDelete}
        />
      </Modal>
    </>
  );
}
