import { BoardButton } from '@/features/dashboard/ui/BoardButton';
import { UserType } from '../types/UserTypes';
import { FormError } from '@/features/auth/ui/FormError';
import { useState } from 'react';
import { useDeleteTeamMember } from '../hooks/team.hooks';

type Props = {
  user: UserType;
  onClose: () => void;
};

export const DeleteUserConfirm = ({ user, onClose }: Props) => {
  const { mutateAsync: removeMember, isPending } = useDeleteTeamMember();

  const hasName = user.firstName || user.lastName;
  const displayName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
  const [error, setError] = useState({
    isError: false,
    message: '',
  });

  const deleteUser = async (id: string) => {
    setError({
      isError: false,
      message: '',
    });

    try {
      await removeMember(id);
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
        {hasName && <p className="text-[12px] text-content-secondary mt-1">{user.email}</p>}
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
          onClick={() => deleteUser(user.id)}
          loading={isPending}
          disabled={isPending}
        >
          Usuń
        </BoardButton>
      </div>
    </div>
  );
};
