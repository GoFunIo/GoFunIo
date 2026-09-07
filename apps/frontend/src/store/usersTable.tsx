import { Car } from 'lucide-react';

import { BoardButton } from '@/features/dashboard/ui/BoardButton';
import { Column } from '@/types/table';

import { UserType } from '@/features/dashboard/types';

export const getUserColumns = (onShowManagerCars: (user: UserType) => void): Column<UserType>[] => [
  {
    header: 'Użytkownik',
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
    header: 'Rola',
    accessor: 'role',
  },

  {
    header: 'Pojazdy',
    accessor: 'cars',
    render: (_, item) => {
      return item.role === 'MANAGER' ? (
        <BoardButton
          disabled={item.carsCount === 0}
          onClick={() => onShowManagerCars(item)}
          size="square"
        >
          <Car size="18" />
        </BoardButton>
      ) : (
        '-'
      );
    },
  },
];
