import { CreditCard, Gauge } from 'lucide-react';
import { BlockWrapper } from '@/features/dashboard/ui/BlockWrapper';
import { VehicleData } from '@/features/dashboard/types';
import { fuelTypeLabels } from '@/features/dashboard/constants/fuelOptions';

interface VehicleSpecsProps {
  car: VehicleData;
  totalExpenses: number;
}

const getFuelLabel = (fuelValue?: VehicleData['fuelType']) => {
  if (!fuelValue) return 'Nieokreślone';
  return fuelTypeLabels[fuelValue] ?? fuelValue;
};

export const VehicleSpecs = ({ car, totalExpenses }: VehicleSpecsProps) => {
  return (
    <div className="flex flex-col gap-6">
      <BlockWrapper className="h-fit">
        <h4 className="text-content-primary font-bold text-[18px] mb-4">Specyfikacja</h4>

        <ul className="text-[14px] text-content-secondary flex flex-col gap-2.5 mb-6">
          <li className="flex justify-between first:pt-0">
            <span>Marka</span>
            <span className="text-content-primary font-medium">{car.brand}</span>
          </li>
          <li className="flex justify-between">
            <span>Model</span>
            <span className="text-content-primary font-medium">{car.model}</span>
          </li>
          <li className="flex justify-between">
            <span>Rejestracja</span>
            <span className="text-content-primary font-mono font-medium">
              {car.registrationNumber}
            </span>
          </li>
          <li className="flex justify-between">
            <span>Rok</span>
            <span className="text-content-primary font-medium">{car.productionYear}</span>
          </li>
          <li className="flex justify-between">
            <span>VIN</span>
            <span className="text-content-primary font-mono font-medium text-[12px] md:text-[14px]">
              {car.vin}
            </span>
          </li>
          <li className="flex justify-between">
            <span>Paliwo</span>
            <span className="text-content-primary font-medium">{getFuelLabel(car.fuelType)}</span>
          </li>
          <li className="flex justify-between">
            <span>Data zakupu</span>
            <span className="text-content-primary font-medium">{car.purchaseDate}</span>
          </li>
        </ul>

        <div className="pt-6 border-t border-icon">
          <h5 className="text-content-primary font-bold text-[14px] mb-2">Notatki</h5>
          <p className="text-[12px] text-content-secondary leading-relaxed">
            {car.notes || 'Samochód służbowy'}
          </p>
        </div>
      </BlockWrapper>

      <BlockWrapper className="p-[20px]">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center text-content-secondary">
              <Gauge size={18} strokeWidth={2} className="text-primary mr-4" />
              <span className="text-[14px] text-content-primary">Przebieg</span>
            </div>
            <p className="font-bold text-[14px] text-content-primary">
              {car.currentMileage?.toLocaleString('pl-PL') ?? '0'} km
            </p>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center text-content-secondary">
              <CreditCard size={18} strokeWidth={2} className="text-primary mr-4" />
              <span className="text-[14px] text-content-primary">Łączne wydatki</span>
            </div>
            <p className="font-bold text-[14px] text-content-primary">
              {totalExpenses > 0
                ? `${totalExpenses.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł`
                : '0.00 zł'}
            </p>
          </div>
        </div>
      </BlockWrapper>
    </div>
  );
};
