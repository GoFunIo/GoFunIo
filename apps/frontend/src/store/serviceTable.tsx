import { ServiceData } from '@/features/dashboard/types';
import { Column } from '@/types/table';
import { Paperclip } from 'lucide-react';

export const serviceColumns: Column<ServiceData>[] = [
  { header: 'Data', accessor: 'serviceDate' },
  {
    header: 'Pojazd',
    accessor: 'vehicle',
    render: (_, item) => `${item.vehicle.brand} ${item.vehicle.model}`,
  },
  {
    header: 'Rejestracja',
    accessor: 'vehicle',
    render: (_, item) => `${item.vehicle.registrationNumber}`,
  },
  { header: 'Typ', accessor: 'type' },
  { header: 'Warsztat', accessor: 'providerName' },
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
    render: (value) => `${value} zł`,
  },
];
