import { useMemo } from 'react';
import { CarFront, Fuel, Gauge, User, Users } from 'lucide-react';
import classNames from 'classnames';
import { useUser } from '../hooks/user.hooks';
import { VehicleData, VehicleDeadlineAlert } from '@/features/dashboard/types';
import { getAlertBadgeText, getAlertVariant, pickMostUrgentAlert } from '@/utils/formatDeadline';

import { BlockWrapper } from '@/features/dashboard/ui/BlockWrapper';
import { IconWrapper } from '@/features/dashboard/ui/IconWrapper';
import { BoardButton } from '@/features/dashboard/ui/BoardButton';
import { fuelTypeLabels } from '../constants/fuelOptions';
import { Tooltip } from '../ui/Tooltip ';

type VehicleCardProps = {
  vehicle: VehicleData;
  alerts?: VehicleDeadlineAlert[];
  onDetailsClick: (id: string) => void;
};

type PersonWithName = {
  firstName: string;
  lastName: string;
};

const formatNames = (people?: PersonWithName[]): string => {
  if (!people || people.length === 0) return 'Brak';

  const firstPerson = `${people[0].firstName} ${people[0].lastName}`;
  if (people.length === 1) return firstPerson;

  return `${firstPerson} + ${people.length - 1}`;
};

const getBadgeConfig = (mostUrgentAlert?: VehicleDeadlineAlert) => {
  if (!mostUrgentAlert) {
    return { text: 'OK', className: 'bg-success text-white' };
  }

  if (mostUrgentAlert.overdue) {
    return { text: 'Termin minął', className: 'bg-alert text-white' };
  }

  const variant = getAlertVariant(mostUrgentAlert.daysRemaining, mostUrgentAlert.overdue);

  if (variant === 'alert') {
    return { text: 'Termin ≤ 7 dni', className: 'bg-alert text-white' };
  }

  return { text: 'Termin ≤ 30 dni', className: 'bg-warning text-white' };
};

export const VehicleCard = ({ vehicle, alerts, onDetailsClick }: VehicleCardProps) => {
  const { data: currentUser } = useUser();

  const orderedManagers = useMemo(() => {
    if (!currentUser) return vehicle.managers;

    const selfIndex = vehicle.managers.findIndex((m) => m.id === currentUser.id);
    if (selfIndex <= 0) return vehicle.managers;

    const self = vehicle.managers[selfIndex];
    const rest = vehicle.managers.filter((_, i) => i !== selfIndex);
    return [self, ...rest];
  }, [vehicle.managers, currentUser]);

  const driverNames = formatNames(vehicle.drivers);
  const managerNames = formatNames(orderedManagers);

  const mostUrgentAlert = useMemo(() => pickMostUrgentAlert(alerts), [alerts]);
  const badge = getBadgeConfig(mostUrgentAlert);

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
            title={
              mostUrgentAlert
                ? getAlertBadgeText(mostUrgentAlert.daysRemaining, mostUrgentAlert.overdue)
                : undefined
            }
          >
            {badge.text}
          </div>
        </div>

        <div className="flex flex-row gap-2 justify-between items-end">
          <div className=" flex flex-col gap-2">
            <div className="flex gap-[10px] items-center text-content-secondary">
              <Fuel size={16} strokeWidth={3} className="shrink-0 text-content-primary" />
              <p className="text-[14px] text-content-secondary uppercase">
                {vehicle.fuelType ? fuelTypeLabels[vehicle.fuelType] : 'Nieokreślone'}
              </p>
            </div>
            <div className="flex gap-[10px] items-center text-content-secondary">
              <Gauge size={16} strokeWidth={3} className="shrink-0 text-content-primary" />
              <p className="text-[14px] text-content-secondary ">
                {vehicle.currentMileage
                  ? `${vehicle.currentMileage.toLocaleString()} km`
                  : 'Brak info'}
              </p>
            </div>
            <div className="flex gap-[10px] items-center text-content-secondary">
              <Tooltip
                content={
                  vehicle.drivers.length > 1
                    ? vehicle.drivers.map((d) => `${d.firstName} ${d.lastName}`).join(', ')
                    : ''
                }
              >
                <div
                  className={classNames(
                    'flex gap-[10px] items-center text-content-secondary',
                    vehicle.drivers.length > 1 && 'cursor-help',
                  )}
                >
                  <Users size={16} strokeWidth={3} className="shrink-0 text-content-primary" />
                  <span className="text-[14px] text-content-secondary">
                    KIEROWCA: {driverNames}
                  </span>
                </div>
              </Tooltip>
            </div>

            <div className="flex gap-[10px] items-center text-content-secondary cursor-help">
              <Tooltip
                content={
                  orderedManagers.length > 1
                    ? orderedManagers
                        .slice(1)
                        .map((m) => `${m.firstName} ${m.lastName}`)
                        .join(', ')
                    : ''
                }
              >
                <div
                  className={classNames(
                    'flex gap-[10px] items-center text-content-secondary',
                    orderedManagers.length > 1 && 'cursor-help',
                  )}
                >
                  <User size={16} strokeWidth={3} className="shrink-0 text-content-primary" />
                  <span className="text-[14px] text-content-secondary">
                    MANAGER: {managerNames}
                  </span>
                </div>
              </Tooltip>
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
