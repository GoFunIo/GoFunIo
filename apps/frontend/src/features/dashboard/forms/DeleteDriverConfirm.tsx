import { DriverType } from '../types/DriverTypes';
import { useState } from 'react';
import { FormError } from '@/features/auth/ui/FormError';
import { BoardButton } from '../ui/BoardButton';
import { useDeleteDriver } from '../hooks/drivers.hooks';

type Props = {
  driver: DriverType;
  onClose: () => void;
};

export const DeleteDriverConfirm = ({ driver, onClose }: Props) => {
  const { mutateAsync: removeDriver, isPending } = useDeleteDriver();

  const hasName = driver.firstName || driver.lastName;
  const displayName = `${driver.firstName || ''} ${driver.lastName || ''}`.trim() || driver.email;
  const [error, setError] = useState({
    isError: false,
    message: '',
  });

  const confirmDeleteDriver = async (id: string) => {
    setError({
      isError: false,
      message: '',
    });
    try {
      await removeDriver(id);
      onClose();
    } catch (error) {
      const err = error as { status?: number; message?: string };

      if (err.status === 0) {
        setError({
          isError: true,
          message: 'Brak połączenia z internetem.',
        });
      } else if (err.status === 409) {
        setError({
          isError: true,
          message: 'Nie możesz usunąć własnego konta.',
        });
      } else {
        setError({
          isError: true,
          message: 'Błąd serwera. Spróbuj ponownie później.',
        });
      }
    }
  };

  return (
    <div className="w-full text-left">
      {error.isError && <FormError message={error.message} />}
      <div className="mb-[24px] p-[16px]  rounded-[7px] border border-icon/50">
        <p className="text-[14px] font-bold text-content-primary">{displayName}</p>
        {hasName && <p className="text-[12px] text-content-secondary mt-1">{driver.email}</p>}
      </div>

      <div className="flex justify-end gap-[12px]  pt-[20px]">
        <BoardButton
          type="button"
          variant="outline"
          size="medium"
          onClick={onClose}
          disabled={isPending}
        >
          Anuluj
        </BoardButton>
        <BoardButton
          type="button"
          variant="danger"
          size="medium"
          onClick={() => confirmDeleteDriver(driver.id)}
          loading={isPending}
          disabled={isPending}
        >
          Usuń
        </BoardButton>
      </div>
    </div>
  );
};
