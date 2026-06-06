import { BoardButton } from '@/features/dashboard/ui/BoardButton';
import { AddServiceFormData } from '../lib/formValidationRules';

export type ServiceEntryType = Partial<AddServiceFormData> & {
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

type Props = {
  service: ServiceEntryType;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
};

export const DeleteServiceConfirm = ({ service, onClose, onConfirm }: Props) => {
  const hasCost = typeof service.cost === 'number' && !isNaN(service.cost);
  const carName = [service.carBrand, service.carModel].filter(Boolean).join(' ');

  return (
    <div className="w-full text-left">
      <div className="mb-[24px] p-[16px] rounded-[7px] border border-icon/50 bg-background-secondary space-y-1">
        <p className="text-[14px] font-bold text-content-primary">{service.serviceType}</p>
        {carName || service.registrationNumber ? (
          <p className="text-[12px] text-content-secondary">
            Pojazd: {carName || 'Nieokreślony'}{' '}
            {service.registrationNumber ? `(${service.registrationNumber})` : ''}
          </p>
        ) : null}
        {hasCost ? (
          <p className="text-[12px] text-content-secondary pt-0.5">
            Koszt operacji: <span className="font-semibold">{service.cost} PLN</span>
          </p>
        ) : null}
      </div>

      <div className="flex justify-end gap-[12px] pt-[20px] border-t border-gray-100">
        <BoardButton type="button" variant="outline" size="medium" onClick={onClose}>
          Anuluj
        </BoardButton>
        <BoardButton type="button" variant="danger" size="medium" onClick={onConfirm}>
          Usuń wpis
        </BoardButton>
      </div>
    </div>
  );
};
