import { useDeleteVehicle } from '@/features/dashboard/hooks/vehicles.hooks';
import { useError } from '@/hooks/useError';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { BoardButton } from '@/features/dashboard/ui/BoardButton';

type Props = {
  car: {
    id: string;
    brand: string;
    model: string;
    registrationNumber?: string;
  };
  onClose: () => void;
  onDeleted?: () => void;
};

export const DeleteCarConfirm = ({ car, onClose, onDeleted }: Props) => {
  const deleteVehicleMutation = useDeleteVehicle();
  const { error, setError } = useError();

  const displayTitle = `${car.brand} ${car.model}`;

  const handleDelete = async () => {
    setError(null);
    try {
      await deleteVehicleMutation.mutateAsync(car.id);
      onDeleted?.();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, { 404: 'Ten pojazd nie istnieje lub został już usunięty.' }));
    }
  };

  return (
    <div className="w-full text-left">
      {error && <p className="text-center text-[14px] font-medium text-alert mb-4">{error}</p>}

      <div className="mb-[24px] p-[16px] rounded-[7px] border border-icon/50 bg-background-secondary">
        <p className="text-[14px] font-bold text-content-primary">{displayTitle}</p>
        {car.registrationNumber && (
          <p className="text-[14px] text-content-secondary mt-1">
            Nr rej.: {car.registrationNumber}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-[12px] pt-[20px]">
        <BoardButton
          type="button"
          variant="outline"
          size="medium"
          onClick={onClose}
          disabled={deleteVehicleMutation.isPending}
        >
          Anuluj
        </BoardButton>
        <BoardButton
          type="button"
          variant="danger"
          size="medium"
          onClick={handleDelete}
          disabled={deleteVehicleMutation.isPending}
        >
          {deleteVehicleMutation.isPending ? 'Usuwanie...' : 'Usuń'}
        </BoardButton>
      </div>
    </div>
  );
};
