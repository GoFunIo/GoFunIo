import { BoardButton } from '@/features/dashboard/ui/BoardButton';
import { UserType } from '../types/UserTypes';
import { useLoading } from '@/hooks/useLoading';
import { deleteTeamMember } from '../api/team.api';
import { useQueryClient } from '@tanstack/react-query';
import { FormError } from '@/features/auth/ui/FormError';
import { useState } from 'react';

type Props = {
  user: UserType;
  onClose: () => void;
};

export const DeleteUserConfirm = ({ user, onClose }: Props) => {
  const { loading, setLoading } = useLoading();
  const queryClient = useQueryClient();
  const hasName = user.firstName || user.lastName;
  const displayName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
  const [error, setError] = useState({
    isError: false,
    message: '',
  });

  const deleteUser = async (id: string) => {
    setLoading(true);
    setError({
      isError: false,
      message: '',
    });
    try {
      await deleteTeamMember(id);
      await queryClient.invalidateQueries({
        queryKey: ['team'],
      });
      onClose();
    } catch (error) {
      const err = error as { status?: number; message?: string };

      if (err.status === 0) {
        setError({
          isError: true,
          message: 'Brak połączenia z internetem.',
        });
      } else {
        setError({
          isError: true,
          message: 'Błąd serwera. Spróbuj ponownie później.',
        });
      }
    } finally {
      setLoading(false);
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
        <BoardButton type="button" variant="outline" size="medium" onClick={onClose}>
          Anuluj
        </BoardButton>
        <BoardButton
          type="button"
          variant="danger"
          size="medium"
          onClick={() => deleteUser(user.id)}
          loading={loading}
        >
          Usuń
        </BoardButton>
      </div>
    </div>
  );
};
