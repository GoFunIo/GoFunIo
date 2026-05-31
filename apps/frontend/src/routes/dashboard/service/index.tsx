import { AddVehicleServiceForm } from '@/features/dashboard/forms/AddVechiclesServicesForm';
import { AddServiceFormData } from '@/features/dashboard/types/FormTypes';
import { Modal } from '@/features/dashboard/ui/Modal';
import { DashboardHeader } from '@/features/dashboard/widgets/DashboardHeader';
import { Filters } from '@/features/dashboard/widgets/Filters';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

export const Route = createFileRoute('/dashboard/service/')({
  component: RouteComponent,
});

type ModalState = boolean | (Partial<AddServiceFormData> & { id: string | number }) | null;

function RouteComponent() {
  const [modalState, setModalState] = useState<ModalState>(null);

  const isModalOpen = !!modalState;
  const isEditMode = typeof modalState === 'object' && modalState !== null;

  const modalTitle = isEditMode ? 'Edytuj wpis serwisowy' : 'Dodaj wpis serwisowy';
  const modalSubtitle = isEditMode
    ? 'Zaktualizuj szczegóły czynności serwisowej dla tego pojazdu.'
    : 'Zapisz każdą czynność serwisową, by mieć pełną historię pojazdu.';

  const handleCloseModal = () => setModalState(null);

  return (
    <>
      <DashboardHeader
        title="Serwis i przeglądy"
        subtitle="Pełna historia serwisowa Twojej floty"
        button={{
          label: 'Dodaj wpis serwisowy',
          onClick: () => setModalState(true),
        }}
      />

      {/*
        W tabeli wpisów serwisowych (wewnątrz <Filters />  do "Edytuj" przypiszesz:
        onClick={() => setModalState(item)} <-- gdzie item to obiekt z danymi wpisu (musi mieć id!)
      */}

      <Filters />
      <Modal
        isOpen={isModalOpen}
        setIsOpen={handleCloseModal}
        title={modalTitle}
        subtitle={modalSubtitle}
      >
        <AddVehicleServiceForm
          onClose={handleCloseModal}
          initialData={isEditMode ? modalState : undefined}
        />
      </Modal>
    </>
  );
}
