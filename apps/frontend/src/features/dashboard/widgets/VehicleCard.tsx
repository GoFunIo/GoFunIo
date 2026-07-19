import { CarFront, Fuel, Gauge, Users } from 'lucide-react';
import classNames from 'classnames';
import { BlockWrapper } from '@/features/dashboard/ui/BlockWrapper';
import { IconWrapper } from '@/features/dashboard/ui/IconWrapper';
import { BoardButton } from '@/features/dashboard/ui/BoardButton';
import { calculateDaysToDate } from '@/utils/calculateDaysToDate';
import { VehicleData } from '@/features/dashboard/types';

export interface VehicleCardProps {
  vehicle: VehicleData;
  onDetailsClick: (id: string) => void;
}

export const VehicleCard = ({ vehicle, onDetailsClick }: VehicleCardProps) => {
  const inspectionDays = vehicle.technicalInspectionExpiry
    ? calculateDaysToDate(vehicle.technicalInspectionExpiry).days
    : Infinity;
  const ocDays = vehicle.ocExpiry ? calculateDaysToDate(vehicle.ocExpiry).days : Infinity;
  const acDays = vehicle.acExpiry ? calculateDaysToDate(vehicle.acExpiry).days : Infinity;

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
              <p className="font-bold text-[14px] text-content-primary uppercase">
                {vehicle.brand} {vehicle.model}
              </p>
              <p className="text-[12px] text-content-secondary font-medium uppercase">
                {vehicle.registrationNumber} · {vehicle.productionYear ?? ''}
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
              <p className="text-[14px] text-content-secondary">
                {vehicle.fuelType ?? 'Nieokreślone'}
              </p>
            </div>
            <div className="flex gap-[10px] items-center text-content-secondary">
              <Gauge size={16} strokeWidth={3} className="shrink-0 text-content-primary" />
              <p className="text-[14px] text-content-secondary">
                {vehicle.currentMileage
                  ? `${vehicle.currentMileage.toLocaleString()} km`
                  : 'Brak info'}
              </p>
            </div>
            <div className="flex gap-[10px] items-center text-content-secondary">
              <Users size={16} strokeWidth={3} className="shrink-0 text-content-primary" />
              <div className="text-[14px] flex items-center gap-[6px]">
                <span className="text-content-secondary">KIEROWCA:</span>
                {vehicle.driverIds.length > 0 ? `Przypisano (${vehicle.driverIds.length})` : 'Brak'}
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
