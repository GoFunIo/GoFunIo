import { BlockWrapper } from '@/features/dashboard/ui/BlockWrapper';
import { IconWrapper } from '@/features/dashboard/ui/IconWrapper';
import { BoardButton } from '@/features/dashboard/ui/BoardButton';
import { CarFront, Fuel, Gauge, Users } from 'lucide-react';
import { calculateDaysToDate } from '@/utils/calculateDaysToDate';
import classNames from 'classnames';

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
    driver?: string;
  };
  onDetailsClick: (id: number) => void;
}

export const VehicleCard = ({ vehicle, onDetailsClick }: VehicleCardProps) => {
  const inspectionDays = calculateDaysToDate(vehicle.technicalInspectionExpiry).days;
  const ocDays = calculateDaysToDate(vehicle.ocExpiry).days;
  const acDays = calculateDaysToDate(vehicle.acExpiry).days;

  const minDays = Math.min(inspectionDays, ocDays, acDays);

  const getBadgeConfig = (daysLeft: number) => {
    if (daysLeft < 0) {
      return {
        text: 'Termin minął',
        className: 'bg-alert text-white',
      };
    }
    if (daysLeft <= 7) {
      return {
        text: 'Termin ≤ 7 dni',
        className: 'bg-alert text-white',
      };
    }
    if (daysLeft <= 30) {
      return {
        text: 'Termin ≤ 30 dni',
        className: 'bg-warning text-white',
      };
    }
    return {
      text: 'OK',
      className: 'bg-success text-white',
    };
  };

  const badge = getBadgeConfig(minDays);

  return (
    <BlockWrapper className="flex flex-col justify-between h-full">
      <div>
        <div className="flex justify-between items-start gap-2 mb-4">
          <div className="flex gap-4 items-start">
            <IconWrapper variant="default" className="w-[40px] h-[40px] bg-info-bg text-info">
              <CarFront size={20} />
            </IconWrapper>
            <div className="flex flex-col gap-0.5">
              <p className="font-bold text-[14px] text-content-primary">
                {vehicle.brand} {vehicle.model}
              </p>
              <p className="text-[12px] text-content-secondary font-medium">
                {vehicle.registrationNumber} · {vehicle.productionYear}
              </p>
            </div>
          </div>

          <div
            className={classNames(
              'px-[10px] py-[4px] rounded-[3px] text-[10px] font-semibold tracking-wide whitespace-nowrap shrink-0',
              badge.className,
            )}
          >
            {badge.text}
          </div>
        </div>

        <div className="flex flex-row gap-2 justify-between items-end">
          <div className=" flex flex-col gap-2">
            <div className="flex gap-[10px] items-center text-content-secondary">
              <Fuel size={16} strokeWidth={3} className="shrink-0 text-content-primary" />
              <p className="text-[14px] text-content-secondary">{vehicle.fuelType}</p>
            </div>
            <div className="flex gap-[10px] items-center text-content-secondary">
              <Gauge size={16} strokeWidth={3} className="shrink-0 text-content-primary" />
              <p className="text-[14px] text-content-secondary">
                {vehicle.currentMileage.toLocaleString()} km
              </p>
            </div>
            <div className="flex gap-[10px] items-center text-content-secondary">
              <Users size={16} strokeWidth={3} className="shrink-0 text-content-primary" />
              <div className="text-[14px] flex items-center gap-[6px]">
                <span className="text-content-secondary">Kierowca:</span>
                {vehicle.driver}
              </div>
            </div>
          </div>
          <BoardButton
            className="!w-10 !h-10 "
            size="square"
            icon="ArrowUpRight"
            onClick={() => onDetailsClick(vehicle.id)}
          ></BoardButton>
        </div>
      </div>
    </BlockWrapper>
  );
};
