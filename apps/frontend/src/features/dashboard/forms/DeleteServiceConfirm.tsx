import { BoardButton } from '@/features/dashboard/ui/BoardButton';
import { ServiceData, serviceTypeLabels } from '../types';
import { useDeleteService } from '@/features/dashboard/hooks/services.hooks';
import { useError } from '@/hooks/useError';
import { getErrorMessage } from '@/utils/getErrorMessage';

export type ServiceEntryType = Pick<
  ServiceData,
  'id' | 'type' | 'providerName' | 'cost' | 'serviceDate' | 'vehicle'
>;

type Props = {
  service: ServiceEntryType;
  onClose: () => void;
  onDeleted?: () => Promise<void> | void;
};

export const DeleteServiceConfirm = ({ service, onClose, onDeleted }: Props) => {
  const deleteServiceMutation = useDeleteService();
  const { error, setError } = useError();

  const costValue = Number(service.cost);
  const hasCost = !isNaN(costValue);
  const carName = [service.vehicle?.brand, service.vehicle?.model].filter(Boolean).join(' ');
  const typeLabel = serviceTypeLabels[service.type] ?? service.type;

  const handleDelete = async () => {
    setError(null);
    try {
      await deleteServiceMutation.mutateAsync(String(service.id));
      onDeleted?.();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, { 404: 'Ten wpis nie istnieje lub został już usunięty.' }));
    }
  };

  return (
    <div className="w-full text-left">
      {error && <p className="text-center text-[14px] font-medium text-alert mb-4">{error}</p>}

      <div className="mb-[24px] p-[16px] rounded-[7px] border border-icon/50 bg-background-secondary space-y-1">
        <p className="text-[14px] font-bold text-content-primary">{typeLabel}</p>
        {carName || service.vehicle?.registrationNumber ? (
          <p className="text-[12px] text-content-secondary">
            Pojazd: {carName || 'Nieokreślony'}{' '}
            {service.vehicle?.registrationNumber ? `(${service.vehicle.registrationNumber})` : ''}
          </p>
        ) : null}
        {hasCost ? (
          <p className="text-[12px] text-content-secondary pt-0.5">
            Koszt operacji: <span className="font-semibold">{costValue} PLN</span>
          </p>
        ) : null}
      </div>

      <div className="flex justify-end gap-[12px] pt-[20px] border-t border-gray-100">
        <BoardButton
          type="button"
          variant="outline"
          size="medium"
          onClick={onClose}
          disabled={deleteServiceMutation.isPending}
        >
          Anuluj
        </BoardButton>
        <BoardButton
          type="button"
          variant="danger"
          size="medium"
          onClick={handleDelete}
          disabled={deleteServiceMutation.isPending}
        >
          {deleteServiceMutation.isPending ? 'Usuwanie...' : 'Usuń wpis'}
        </BoardButton>
      </div>
    </div>
  );
};
