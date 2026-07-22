import { useState } from 'react';
import { useLoading } from '@/hooks/useLoading';
import { BoardButton } from '@/features/dashboard/ui/BoardButton';

type Props = {
  car: {
    id: string;
    brand: string;
    model: string;
    registrationNumber?: string;
  };
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
};

export const DeleteCarConfirm = ({ car, onClose, onConfirm }: Props) => {
  const { loading, setLoading } = useLoading();
  const [error, setError] = useState<string | null>(null);

  const displayTitle = `${car.brand} ${car.model}`;

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      const apiError = err as { message?: string };
      setError(apiError?.message || 'Nie udało się usunąć pojazdu. Spróbuj ponownie.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full text-left">
      {error && <p className="text-center text-[14px] font-medium text-alert mb-4">{error}</p>}

      <div className="mb-[24px] p-[16px] rounded-[7px] border border-icon/50 bg-background-secondary">
        <p className="text-[14px] font-bold text-content-primary">{displayTitle}</p>
        {car.registrationNumber && (
          <p className="text-[12px] text-content-secondary mt-1">
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
          disabled={loading}
        >
          Anuluj
        </BoardButton>
        <BoardButton
          type="button"
          variant="danger"
          size="medium"
          onClick={handleDelete}
          disabled={loading}
        >
          {loading ? 'Usuwanie...' : 'Usuń'}
        </BoardButton>
      </div>
    </div>
  );
};
