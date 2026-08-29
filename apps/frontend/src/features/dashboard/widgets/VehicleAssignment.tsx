import { Users, User as UserIcon, X } from 'lucide-react';
import {
  useAddDriverToVehicle,
  useRemoveDriverFromVehicle,
  useAssignManagerToVehicle,
  useRemoveManagerFromVehicle,
} from '@/features/dashboard/hooks/vehicles.hooks';
import { useDrivers } from '@/features/dashboard/hooks/drivers.hooks';
import { useTeam } from '@/features/dashboard/hooks/team.hooks';
import { usePermissions } from '@/features/dashboard/hooks/usePermissions';
import { useError } from '@/hooks/useError';

import { BlockWrapper } from '@/features/dashboard/ui/BlockWrapper';
import { SelectWithAction } from '@/features/dashboard/ui/SelectWithAction';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { UserType, VehicleData } from '@/features/dashboard/types';

type Props = {
  vehicle: VehicleData;
};

export const VehicleAssignments = ({ vehicle }: Props) => {
  const { data: drivers } = useDrivers();
  const { data: team } = useTeam();

  const { canEditVehicle, canManageVehicleManagers } = usePermissions();
  const { error, setError } = useError();

  const addDriver = useAddDriverToVehicle(vehicle.id);
  const removeDriver = useRemoveDriverFromVehicle(vehicle.id);
  const assignManager = useAssignManagerToVehicle(vehicle.id);
  const removeManager = useRemoveManagerFromVehicle(vehicle.id);

  const currentDriverIds = vehicle.drivers.map((d) => d.id);
  const currentManagerIds = vehicle.managers.map((m) => m.id);

  const assignedDrivers = vehicle.drivers;
  const assignedManagers = vehicle.managers;

  const teamManagers: UserType[] = (team ?? []).filter((person) => person.role === 'MANAGER');
  const availableDrivers = (drivers ?? []).filter((d) => !currentDriverIds.includes(d.id));
  const availableManagers = teamManagers.filter((m) => !currentManagerIds.includes(m.id));

  const handleAddDriver = async (driverId: string | number) => {
    setError(null);
    try {
      await addDriver.mutateAsync(String(driverId));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleRemoveDriver = async (driverId: string) => {
    setError(null);
    try {
      await removeDriver.mutateAsync(driverId);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleAddManager = async (managerId: string | number) => {
    setError(null);
    try {
      await assignManager.mutateAsync(String(managerId));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleRemoveManager = async (managerId: string) => {
    setError(null);
    try {
      await removeManager.mutateAsync(managerId);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <BlockWrapper className="flex flex-col gap-6">
      {error && <p className="text-alert text-[12px] font-medium text-center">{error}</p>}

      {/* KIEROWCY */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-content-primary" />
          <p className="text-[14px] font-semibold text-content-primary">Przypisani kierowcy</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {assignedDrivers.length === 0 && (
            <span className="text-[13px] text-content-secondary">Brak przypisanych kierowców</span>
          )}
          {assignedDrivers.map((driver) => (
            <span
              key={driver.id}
              className="flex items-center gap-2 px-[10px] py-[6px] rounded-[3px] bg-bg-section text-[13px] text-content-primary"
            >
              {driver.firstName} {driver.lastName}
              {canEditVehicle && (
                <button
                  type="button"
                  onClick={() => handleRemoveDriver(driver.id)}
                  disabled={addDriver.isPending || removeDriver.isPending}
                  className="text-content-secondary hover:text-alert custom-transition"
                >
                  <X size={12} />
                </button>
              )}
            </span>
          ))}
        </div>

        {canEditVehicle && (
          <SelectWithAction
            options={availableDrivers.map((d) => ({
              value: d.id,
              label: `${d.firstName} ${d.lastName}`,
            }))}
            value=""
            onChange={handleAddDriver}
            placeholder={
              availableDrivers.length === 0
                ? 'Brak dostępnych kierowców'
                : assignedDrivers.length > 0
                  ? '-- Dodaj kolejnego kierowcę --'
                  : '-- Przypisz kierowcę --'
            }
          />
        )}
      </div>

      {/* MANAGEROWIE */}
      {canManageVehicleManagers && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <UserIcon size={16} className="text-content-primary" />
            <p className="text-[14px] font-semibold text-content-primary">Przypisani managerowie</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {assignedManagers.length === 0 && (
              <span className="text-[13px] text-content-secondary">
                Brak przypisanych managerów
              </span>
            )}
            {assignedManagers.map((manager) => (
              <span
                key={manager.id}
                className="flex items-center gap-2 px-[10px] py-[6px] rounded-[3px] bg-bg-section text-[13px] text-content-primary"
              >
                {manager.firstName} {manager.lastName}
                <button
                  type="button"
                  onClick={() => handleRemoveManager(manager.id)}
                  disabled={assignManager.isPending || removeManager.isPending}
                  className="text-content-secondary hover:text-alert custom-transition"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>

          <SelectWithAction
            options={availableManagers.map((m) => ({
              value: m.id,
              label: `${m.firstName} ${m.lastName}`,
            }))}
            value=""
            onChange={handleAddManager}
            placeholder={
              availableManagers.length === 0 ? 'Brak dostępnych managerów' : '-- Dodaj managera --'
            }
          />
        </div>
      )}
    </BlockWrapper>
  );
};
