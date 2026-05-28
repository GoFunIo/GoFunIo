import { Column, ServiceTable } from '@/types/table';
import { Paperclip } from 'lucide-react';

export const serviceColumns: Column<ServiceTable>[] = [
  { header: 'Data', accessor: 'date' },
  { header: 'Pojazd', accessor: 'car' },
  { header: 'Rejestracja', accessor: 'plate' },
  { header: 'Typ', accessor: 'type' },
  { header: 'Warsztat', accessor: 'workshop' },
  {
    header: 'Załącznik',
    accessor: 'hasAttachment',
    render: (has) =>
      has ? <Paperclip size={18} className="text-gray-400 inline cursor-pointer" /> : '-',
  },
  {
    header: 'Koszt',
    accessor: 'cost',
    isImportant: true,
    render: (value) => `${value.toFixed(2)} zł`,
  },
];

export const serviceData: ServiceTable[] = [
  {
    id: '1',
    date: '19.03.2026',
    car: 'Toyota Corolla',
    plate: 'WA 12345',
    type: 'Wymiana oleju',
    workshop: 'Auto-Serwis Kowalski',
    hasAttachment: true,
    cost: 320.0,
  },
  {
    id: '2',
    date: '19.12.2025',
    car: 'Toyota Corolla',
    plate: 'WA 12345',
    type: 'Przegląd techniczny',
    workshop: 'Stacja Diagnostyczna SKP',
    hasAttachment: true,
    cost: 99.0,
  },
  {
    id: '2',
    date: '19.12.2025',
    car: 'Toyota Corolla',
    plate: 'WA 12345',
    type: 'Przegląd techniczny',
    workshop: 'Stacja Diagnostyczna SKP',
    hasAttachment: false,
    cost: 99.0,
  },
];

// export const serviceData = []
