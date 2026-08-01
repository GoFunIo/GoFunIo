import { DriverType } from '../types/DriverTypes';
import { FormError } from '@/features/auth/ui/FormError';
import { BoardButton } from '../ui/BoardButton';
import { useDeleteDriver } from '../hooks/drivers.hooks';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { useError } from '@/hooks/useError';

type Props = {
  driver: DriverType;
  onClose: () => void;
};

export const DeleteDriverConfirm = ({ driver, onClose }: Props) => {
  const { mutateAsync: removeDriver, isPending } = useDeleteDriver();
  const { error, setError } = useError();

  const hasName = driver.firstName || driver.lastName;
  const displayName = `${driver.firstName || ''} ${driver.lastName || ''}`.trim() || driver.email;

  const confirmDeleteDriver = async (id: string) => {
    try {
      await removeDriver(id);
      onClose();
    } catch (error) {
      setError(getErrorMessage(error));
    }
  };

  return (
    <div className="w-full text-left">
      {error && <FormError message={error} />}
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
