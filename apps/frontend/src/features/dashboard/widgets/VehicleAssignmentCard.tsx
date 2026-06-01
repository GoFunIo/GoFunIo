import { useState } from 'react';
import { Car } from 'lucide-react';
import { SelectWithAction } from '../ui/SelectWithAction';

export type Vehicle = {
  id: number;
  title: string;
  year: string;
  fuel: string;
  registration: string;
  mileage: number;
  vti: number;
  currentOwner?: string;
};

type UserOption = {
  id: number;
  value: string | number | null;
  label: string;
};

type VehicleAssignmentCardProps = {
  vehicle: Vehicle;
  users: UserOption[];
  onAssign?: (vehicleId: number, userId: string | number) => void;
};

export const VehicleAssignmentCard = ({ vehicle, users, onAssign }: VehicleAssignmentCardProps) => {
  const [selectedUser, setSelectedUser] = useState<string | number | null>(null);

  const handleActionTriggered = (userId: string | number | null) => {
    if (userId !== null && userId !== '' && onAssign) {
      onAssign(vehicle.id, userId);
      setSelectedUser(null);
    }
  };

  return (
    <div className="bg-bg-page border border-icon rounded-[7px] p-5 shadow-sm flex flex-col gap-6 ">
      <div className="flex items-start gap-4">
        <div className="w-[70px] h-[70px] bg-info-bg-icon rounded-[3px] flex items-center justify-center text-info shrink-0">
          <Car size={30} />
        </div>
        <div className="flex flex-col gap-[4px]">
          <h3 className="font-bold text-[16px] text-content-primary leading-tight">
            {vehicle.title}
          </h3>
          <span className="text-[14px] text-content-secondary ">
            {vehicle.year} · {vehicle.fuel}
          </span>
          <span className="text-[14px] font-medium text-content-secondary ">
            {vehicle.registration}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-[10px]">
        <span className="text-[12px] font-bold text-content-primary uppercase tracking-wider">
          Aktualny właściciel
        </span>
        <div className="bg-primary text-white text-[12px] font-medium px-4 py-2 rounded-[3px] w-fit ">
          {vehicle.currentOwner || 'Brak przypisania'}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 ">
        <label className="text-[12px] font-bold text-content-primary uppercase tracking-wider">
          Przypisz do:
        </label>

        <div className="w-full">
          <SelectWithAction
            options={users}
            value={selectedUser}
            onChange={(val) => setSelectedUser(val)}
            onAction={handleActionTriggered}
            placeholder="Wybierz użytkownika..."
            clearOption={true}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
};
