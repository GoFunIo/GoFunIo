import { BlockWrapper } from '@/features/dashboard/ui/BlockWrapper';
import { IconWrapper } from '@/features/dashboard/ui/IconWrapper';
import { DaysAmount } from '@/features/dashboard/ui/DaysAmount';
import { BoardButton } from '@/features/dashboard/ui/BoardButton';
import { Calendar, CarFront, Gauge } from 'lucide-react';
import { calculateDaysToDate } from '@/utils/calculateDaysToDate';

export interface VehicleCardProps {
  vehicle: {
    id: number;
    brand: string;
    model: string;
    productionYear: string;
    fuelType: string;
    registrationNumber: string;
    currentMileage: number;
    vin: string;
    purchaseDate: string;
    ocExpiry: string;
    acExpiry: string;
    technicalInspectionExpiry: string;
    notes: string;
  };
  onDetailsClick: (id: number) => void;
}

export const VehicleCard = ({ vehicle, onDetailsClick }: VehicleCardProps) => {
  const { days } = calculateDaysToDate(vehicle.technicalInspectionExpiry);

  return (
    <BlockWrapper className="flex flex-col justify-between h-full">
      <div>
        <div className="flex gap-4 items-start mb-6">
          <IconWrapper variant="default" className="w-[70px] h-[70px]">
            <CarFront size={30} />
          </IconWrapper>
          <div className=" flex flex-col gap-1 ">
            <p className="font-bold text-[14px] text-content-primary">
              {vehicle.brand} {vehicle.model}
            </p>
            <p className="text-[14px] text-content-secondary ">
              {vehicle.productionYear} · {vehicle.fuelType}
            </p>
            <p className="text-[14px] text-content-secondary ">{vehicle.registrationNumber}</p>
          </div>
        </div>

        <div className="mb-6 flex flex-col gap-2">
          <div className="flex gap-[10px] items-center text-content-secondary">
            <Gauge size={16} strokeWidth={3} className="shrink-0 text-content-primary" />
            <p className="text-[14px] text-content-secondary">
              {vehicle.currentMileage.toLocaleString()} km
            </p>
          </div>
          <div className="flex gap-[10px] items-center text-content-secondary">
            <Calendar size={16} strokeWidth={3} className="shrink-0 text-content-primary" />
            <div className="text-[13px] flex items-center gap-[6px]">
              <span className="text-content-secondary">Przegląd za:</span>

              <DaysAmount days={days} />
            </div>
          </div>
        </div>
      </div>

      <BoardButton
        className="w-full"
        size="medium"
        icon="arrow"
        onClick={() => onDetailsClick(vehicle.id)}
      >
        Zobacz szczegóły
      </BoardButton>
    </BlockWrapper>
  );
};
