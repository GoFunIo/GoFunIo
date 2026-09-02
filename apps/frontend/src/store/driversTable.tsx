import { Car } from 'lucide-react';
import { Column } from '@/types/table';
import { DriverType } from '@/features/dashboard/types';
import { BoardButton } from '@/features/dashboard/ui/BoardButton';

export const getDriverColumns = (
  onShowDriverCars: (driver: DriverType) => void,
): Column<DriverType>[] => [
  {
    header: 'Kierowca',
    accessor: 'firstName',
    isImportant: true,
    render: (_, item) => {
      const fullName = [item.firstName, item.lastName].filter(Boolean).join(' ');

      return fullName || 'User';
    },
  },

  {
    header: 'E-mail',
    accessor: 'email',
  },

  {
    header: 'Telefon',
    accessor: 'phone',
  },

  {
    header: 'Notatki',
    accessor: 'notes',
    render: (_, item) => {
      return item.notes || '-';
    },
  },

  {
    header: 'Pojazdy',
    accessor: 'cars',
    render: (_, item) => {
      return (
        <BoardButton
          disabled={item.activeVehicles.length === 0 ? true : false}
          onClick={() => onShowDriverCars(item)}
          size="square"
        >
          <Car size="18" />
        </BoardButton>
      );
    },
  },
];
