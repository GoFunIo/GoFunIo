import { Input } from '@/components/ui/Input';
import { LoadingIcon } from '@/components/ui/LoadingIcon';
import { useDrivers } from '@/features/dashboard/hooks/drivers.hooks';
import { useDriversModal } from '@/features/dashboard/hooks/useDriversModal';
import { usePermissions } from '@/features/dashboard/hooks/usePermissions';
import { DriverType } from '@/features/dashboard/types/DriverTypes';
import { BlockWrapper } from '@/features/dashboard/ui/BlockWrapper';
import { BoardButton } from '@/features/dashboard/ui/BoardButton';
import { DataTable } from '@/features/dashboard/widgets/DataTable';
import { EmptyPlaceholder } from '@/features/dashboard/widgets/EmptyPlaceholder';
import { getDriverColumns } from '@/store/driversTable';
import { createFileRoute } from '@tanstack/react-router';
import { Users } from 'lucide-react';
import { useMemo, useState } from 'react';

export const Route = createFileRoute('/dashboard/settings/drivers')({
  component: RouteComponent,
});

function RouteComponent() {
  const { canDeleteDrivers } = usePermissions();
  const { data: drivers, isPending } = useDrivers();
  const { openModal, DriversModal } = useDriversModal();

  const [searchQuery, setSearchQuery] = useState<string>('');

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
          onClick={() => openModal('add_driver')}
          className="w-full sm:w-auto sm:min-w-[180px]"
        >
          Dodaj kierowcę
        </BoardButton>
      </div>

      <BlockWrapper>
        {isPending ? (
          <LoadingIcon className="m-auto my-[24px]" />
        ) : filteredDrivers.length === 0 ? (
          <EmptyPlaceholder
            title="Brak kierowców"
            icon={<Users size={24} className="text-primary" />}
          />
        ) : (
          <DataTable
            columns={getDriverColumns((driver) => openModal('showCars_driver', driver))}
            data={filteredDrivers}
            onEdit={(driver) => openModal('delete_driver', driver)}
            onDelete={canDeleteDrivers ? (driver) => openModal('delete_driver', driver) : undefined}
            footer={false}
          />
        )}
      </BlockWrapper>

      {DriversModal}
    </>
  );
}
