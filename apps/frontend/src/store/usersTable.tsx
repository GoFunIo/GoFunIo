export interface UsersTable {
  id: string | number;
  user: string;
  email: string;
  role: 'Admin' | 'User';
  assignedVehicleId: string | number;
}

export const initialUsersData: UsersTable[] = [
  {
    id: '1',
    user: 'Anna Kowalska',
    email: 'anna.k@gmail.com',
    role: 'User',
    assignedVehicleId: '1',
  },
  {
    id: '2',
    user: 'Marek Nowak',
    email: 'admin@autokeep.pl',
    role: 'Admin',
    assignedVehicleId: 'none',
  },
  {
    id: '3',
    user: 'Jan Nowak',
    email: 'jan.n@gmail.com',
    role: 'User',
    assignedVehicleId: '2',
  },
];
