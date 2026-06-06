import { BoardButton } from '@/features/dashboard/ui/BoardButton';

type Props = {
  car: {
    id: string | number;
    brand: string;
    model: string;
    registrationNumber?: string;
  };
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
};

export const DeleteCarConfirm = ({ car, onClose, onConfirm }: Props) => {
  const displayTitle = `${car.brand} ${car.model}`;

  return (
    <div className="w-full text-left">
      <div className="mb-[24px] p-[16px] rounded-[7px] border border-icon/50 bg-background-secondary">
        <p className="text-[14px] font-bold text-content-primary">{displayTitle}</p>
        {car.registrationNumber && (
          <p className="text-[12px] text-content-secondary mt-1">
            Nr rej.: {car.registrationNumber}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-[12px] pt-[20px]">
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
