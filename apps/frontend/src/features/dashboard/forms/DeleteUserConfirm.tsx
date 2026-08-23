import { BoardButton } from '@/features/dashboard/ui/BoardButton';
import { UserType } from '../types/UserTypes';
import { FormError } from '@/features/auth/ui/FormError';
import { useDeleteTeamMember } from '../hooks/team.hooks';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { useError } from '@/hooks/useError';

type Props = {
  user: UserType;
  onClose: () => void;
};

export const DeleteUserConfirm = ({ user, onClose }: Props) => {
  const { mutateAsync: removeMember, isPending } = useDeleteTeamMember();
  const { error, setError } = useError();

  const hasName = user.firstName || user.lastName;
  const displayName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;

  const deleteUser = async (id: string) => {
    try {
      await removeMember(id);
      onClose();
    } catch (error) {
      setError(
        getErrorMessage(error, {
          403: 'Brak uprawnień.',
          404: 'Nie znaleziono użytkownika.',
          409: 'Nie możesz usunąć własnego konta.',
        }),
      );
    }
  };

  return (
    <div className="w-full text-left">
      {error && <FormError message={error} />}
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
