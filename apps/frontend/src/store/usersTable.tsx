import { Column, UsersTable } from '@/types/table';

export const usersColumns: Column<UsersTable>[] = [
  { header: 'Użytkownik', accessor: 'user' },
  { header: 'E-mail', accessor: 'email' },
  { header: 'Rola', accessor: 'role' },
  { header: 'Liczba pojazdów', accessor: 'carsAmount' },
];

export const usersData: UsersTable[] = [
  { id: '1', user: 'Anna Kowalska', email: 'anna.k@gmail.com', role: 'Użytkownik', carsAmount: 1 },
  { id: '2', user: 'Anna Kowalska', email: 'anna.k@gmail.com', role: 'Użytkownik', carsAmount: 1 },
  { id: '3', user: 'Anna Kowalska', email: 'anna.k@gmail.com', role: 'Użytkownik', carsAmount: 1 },
];

// export const usersData = []
