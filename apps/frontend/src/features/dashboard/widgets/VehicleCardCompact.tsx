import { CarFront } from 'lucide-react';
import { BlockWrapper } from '../ui/BlockWrapper';
import { IconWrapper } from '../ui/IconWrapper';
import { BoardButton } from '../ui/BoardButton';

interface VehicleCompactData {
  id: string;
  brand: string;
  model: string;
  registrationNumber: string;
}

interface VehicleCardProps {
  vehicle: VehicleCompactData;
  onDetailsClick: (id: string) => void;
}

export const VehicleCardCompact = ({ vehicle, onDetailsClick }: VehicleCardProps) => {
  return (
    <BlockWrapper className="flex flex-col justify-between h-full">
      <div className="flex justify-between items-start gap-2">
        <div className="flex gap-4 items-start w-full">
          <IconWrapper variant="default" className="w-[40px] h-[40px] bg-info-bg text-info">
            <CarFront size={20} />
          </IconWrapper>
          <div className="flex flex-col gap-0.5">
            <p className="font-bold text-[14px] text-content-primary uppercase">
              {vehicle.brand} {vehicle.model}
            </p>
            <p className="text-[12px] text-content-secondary font-medium uppercase">
              {vehicle.registrationNumber}
            </p>
          </div>

          <BoardButton
            className="!w-10 !h-10 !ml-auto"
            size="square"
            icon="ArrowUpRight"
            onClick={() => onDetailsClick(vehicle.id)}
          ></BoardButton>
        </div>
      </div>
    </BlockWrapper>
  );
};
