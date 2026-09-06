import { serviceTypeLabels } from '@/features/dashboard/constants/serviceOptions';
import { ServiceData, ServiceType } from '@/features/dashboard/types';
import { Column } from '@/types/table';
import { Paperclip } from 'lucide-react';

export const getServiceColumns = (
  onAttachments: (service: ServiceData) => void,
): Column<ServiceData>[] => [
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
  {
    header: 'Typ',
    accessor: 'type',
    render: (value) => serviceTypeLabels[value as ServiceType],
  },
  { header: 'Miejsce usługi', accessor: 'providerName' },
  {
    header: 'Załącznik',
    accessor: 'hasAttachment',
    render: (_, item) => (
      <button type="button" className="cursor-pointer" onClick={() => onAttachments(item)}>
        <Paperclip size={18} className="text-gray-400 inline" />
      </button>
    ),
  },
  {
    header: 'Koszt',
    accessor: 'cost',
    isImportant: true,
    render: (value) => `${value} zł`,
  },
];
