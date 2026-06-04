import { AddVehicleServiceForm } from '@/features/dashboard/forms/AddVehiclesServicesForm';
import { AddServiceFormData } from '@/features/dashboard/lib/formValidationRules';
import { BlockWrapper } from '@/features/dashboard/ui/BlockWrapper';
import { DeleteServiceConfirm } from '@/features/dashboard/ui/DeleteServiceConfirm';
import { Modal } from '@/features/dashboard/ui/Modal';
import { DashboardHeader } from '@/features/dashboard/widgets/DashboardHeader';
import { DataTable } from '@/features/dashboard/widgets/DataTable';
import { EmptyPlaceholder } from '@/features/dashboard/widgets/EmptyPlaceholder';
import { Filters } from '@/features/dashboard/widgets/Filters';
import { serviceColumns, serviceData } from '@/store/serviceTable';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

export const Route = createFileRoute('/dashboard/service/')({
  component: RouteComponent,
});

type ServiceEntryType = Partial<AddServiceFormData> & {
  id: string | number;
  serviceType: string;
  cost: number;
  servicePlace: string;
  serviceDate: string;
  vehicleId: string;

  carBrand?: string;
  carModel?: string;
  registrationNumber?: string;
};

type ModalState = boolean | ServiceEntryType | null;
type DeleteModalState = ServiceEntryType | null;

function RouteComponent() {
  const [modalState, setModalState] = useState<ModalState>(null);
  const [deleteModalState, setDeleteModalState] = useState<DeleteModalState>(null);

  const isModalOpen = !!modalState;
  const isEditMode = typeof modalState === 'object' && modalState !== null;
  const isDeleteModalOpen = !!deleteModalState;

  const modalTitle = isEditMode ? 'Edytuj wpis serwisowy' : 'Dodaj wpis serwisowy';
  const modalSubtitle = isEditMode
    ? 'Zaktualizuj szczegóły czynności serwisowej dla tego pojazdu.'
    : 'Zapisz każdą czynność serwisową, by mieć pełną historię pojazdu.';

  const handleCloseModal = () => setModalState(null);
  const handleCloseDeleteModal = () => setDeleteModalState(null);

  const handleDeleteConfirm = async () => {
    if (!deleteModalState) return;
    try {
      console.log('Usuwanie wpisu serwisowego o ID:', deleteModalState.id);
      // Miejsce na API: await axios.delete(`/api/services/${deleteModalState.id}`);
      handleCloseDeleteModal();
    } catch (error) {
      console.error('Błąd podczas usuwania wpisu:', error);
    }
  };

  // Dane testowe
  const mockServiceEntry: ServiceEntryType = {
    id: 104,
    serviceType: 'Wymiana oleju',
    cost: 450,
    servicePlace: 'Auto-Serwis Kowalski',
    serviceDate: '2026-03-19',
    vehicleId: '1',
    carBrand: 'Toyota',
    carModel: 'Corolla',
    registrationNumber: 'WA 12345',
  };

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

      <Filters />

      {serviceData.length === 0 || !serviceData ? (
        <BlockWrapper>
          <EmptyPlaceholder title="Brak wpisów spełniających filtry." />
        </BlockWrapper>
      ) : (
        <DataTable
          columns={serviceColumns}
          data={serviceData}
          onEdit={() => setModalState(mockServiceEntry)}
          onDelete={() => setDeleteModalState(mockServiceEntry)}
          footerLabel="Łącznie: 419.00 zł"
        />
      )}

      {/* MODAL 1: DODAWANIE / EDYCJA WPISU */}
      <Modal
        isOpen={isModalOpen}
        setIsOpen={handleCloseModal}
        title={modalTitle}
        subtitle={modalSubtitle}
      >
        <AddVehicleServiceForm
          onClose={handleCloseModal}
          key={typeof modalState === 'object' && modalState !== null ? modalState.id : 'new'}
          initialData={isEditMode ? modalState : undefined}
        />
      </Modal>

      {/* MODAL 2: POTWIERDZENIE USUWANIA WPISU */}
      <Modal
        isOpen={isDeleteModalOpen}
        setIsOpen={handleCloseDeleteModal}
        title="Usuń wpis serwisowy"
        subtitle="Czy na pewno chcesz usunąć ten wpis z historii serwisowej? Ta operacja jest nieodwracalna."
      >
        {deleteModalState && (
          <DeleteServiceConfirm
            service={deleteModalState}
            onConfirm={handleDeleteConfirm}
            onClose={handleCloseDeleteModal}
          />
        )}
      </Modal>
    </>
  );
}
