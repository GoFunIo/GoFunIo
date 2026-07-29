import { Input } from '@/components/ui/Input';
import { LoadingIcon } from '@/components/ui/LoadingIcon';
import { AddDriverForm } from '@/features/dashboard/forms/AddDriverForm';
import { DeleteDriverConfirm } from '@/features/dashboard/forms/DeleteDriverConfirm';
import { EditDriverForm } from '@/features/dashboard/forms/EditDriverForm';
import { useDrivers } from '@/features/dashboard/hooks/drivers.hooks';
import { DriverType } from '@/features/dashboard/types/DriverTypes';
import { BlockWrapper } from '@/features/dashboard/ui/BlockWrapper';
import { BoardButton } from '@/features/dashboard/ui/BoardButton';
import { Modal } from '@/features/dashboard/ui/Modal';
import { DataTable } from '@/features/dashboard/widgets/DataTable';
import { EmptyPlaceholder } from '@/features/dashboard/widgets/EmptyPlaceholder';
import { Column } from '@/types/table';
import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';

export const Route = createFileRoute('/dashboard/settings/drivers')({
  component: RouteComponent,
});

type ModalType = 'add' | 'edit' | 'delete' | null;

function RouteComponent() {
  const { data: drivers, isPending } = useDrivers();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedDriver, setSelectedDriver] = useState<DriverType | null>(null);

  // Dynamiczne filtrowanie kierowcow
  const filteredDrivers = useMemo(() => {
    if (!drivers) return [];

    const query = searchQuery.trim().toLowerCase();

    if (!query) return drivers;

    return drivers.filter((driver: DriverType) => {
      const firstName = driver.firstName?.toLowerCase() ?? '';
      const lastName = driver.lastName?.toLowerCase() ?? '';
      const fullName = `${firstName} ${lastName}`.trim();
      const email = driver.email.toLowerCase();

      return (
        firstName.includes(query) ||
        lastName.includes(query) ||
        fullName.includes(query) ||
        email.includes(query)
      );
    });
  }, [drivers, searchQuery]);

  const handleAddUserClick = () => {
    setSelectedDriver(null);
    setActiveModal('add');
  };

  const handleEditUserClick = (driver: DriverType) => {
    setSelectedDriver(driver);
    setActiveModal('edit');
  };

  const handleDeleteUserClick = (driver: DriverType) => {
    setSelectedDriver(driver);
    setActiveModal('delete');
  };

  const columns: Column<DriverType>[] = [
    {
      header: 'Kierowca',
      accessor: 'firstName',
      isImportant: true,
      render: (_, item) => {
        const fullName = [item.firstName, item.lastName].filter(Boolean).join(' ');

        return fullName || 'User';
      },
    },
    { header: 'E-mail', accessor: 'email' },
    { header: 'Telefon', accessor: 'phone' },
    {
      header: 'Notatki',
      accessor: 'notes',
      render: (_, item) => {
        return item.notes ? item.notes : '-';
      },
    },
  ];

  const getModalConfig = () => {
    switch (activeModal) {
      case 'add':
        return {
          title: 'Dodaj użytkownika',
          subtitle: 'Utwórz nowe konto i opcjonalnie wyślij zaproszenie e-mail.',
          content: <AddDriverForm onClose={() => setActiveModal(null)} />,
        };

      case 'edit':
        if (!selectedDriver) return { title: '', subtitle: '', content: null };

        return {
          title: 'Edytuj użytkownika',
          subtitle: 'Zaktualizuj dane użytkownika i jego rolę.',
          content: (
            <EditDriverForm
              initialData={selectedDriver}
              onClose={() => {
                setActiveModal(null);
                setSelectedDriver(null);
              }}
            />
          ),
        };
      case 'delete':
        if (!selectedDriver) return { title: '', subtitle: '', content: null };

        return {
          title: 'Usuń użytkownika',
          subtitle:
            'Czy na pewno chcesz usunąć tego użytkownika z systemu? Ta operacja jest nieodwracalna.',
          content: (
            <DeleteDriverConfirm
              driver={selectedDriver}
              onClose={() => {
                setActiveModal(null);
                setSelectedDriver(null);
              }}
            />
          ),
        };
      default:
        return { title: '', subtitle: '', content: null };
    }
  };

  const modalConfig = getModalConfig();

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 w-full">
        <div className="w-full sm:max-w-[320px]">
          <Input
            name="searchDrivers"
            placeholder="Szukaj kierowcę"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="!min-h-[45px]"
          />
        </div>

        <BoardButton
          type="button"
          variant="default"
          size="big"
          icon="add"
          onClick={handleAddUserClick}
          className="w-full sm:w-auto sm:min-w-[180px]"
        >
          Dodaj kierowcę
        </BoardButton>
      </div>

      <BlockWrapper>
        {isPending ? (
          <LoadingIcon className="m-auto my-[24px]" />
        ) : filteredDrivers.length === 0 ? (
          <EmptyPlaceholder title="Brak kierowców" />
        ) : (
          <DataTable
            columns={columns}
            data={filteredDrivers}
            onEdit={handleEditUserClick}
            onDelete={handleDeleteUserClick}
            footer={false}
          />
        )}
      </BlockWrapper>

      <Modal
        isOpen={activeModal !== null}
        setIsOpen={(isOpen) => !isOpen && setActiveModal(null)}
        title={modalConfig.title}
        subtitle={modalConfig.subtitle}
      >
        {modalConfig.content}
      </Modal>
    </>
  );
}
