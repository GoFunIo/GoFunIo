import { BoardButton } from '@/features/dashboard/ui/BoardButton';
import { UserManagementFormData } from '../lib/formValidationRules';

type Props = {
  user: Partial<UserManagementFormData> & { id: string | number; email: string };
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
};

export const DeleteUserConfirm = ({ user, onClose, onConfirm }: Props) => {
  const hasName = user.firstName || user.lastName;
  const displayName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;

  return (
    <div className="w-full text-left">
      <div className="mb-[24px] p-[16px]  rounded-[7px] border border-icon/50">
        <p className="text-[14px] font-bold text-content-primary">{displayName}</p>
        {hasName && <p className="text-[12px] text-content-secondary mt-1">{user.email}</p>}
      </div>

      <div className="flex justify-end gap-[12px]  pt-[20px]">
        <BoardButton type="button" variant="outline" size="medium" onClick={onClose}>
          Anuluj
        </BoardButton>
        <BoardButton type="button" variant="danger" size="medium" onClick={onConfirm}>
          Usuń
        </BoardButton>
      </div>
    </div>
  );
};
