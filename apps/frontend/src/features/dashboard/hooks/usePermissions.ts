import { useUser } from './user.hooks';

export const usePermissions = () => {
  const { data: user } = useUser();

  const isOwner = user?.role === 'OWNER';
  const isAdmin = user?.role === 'ADMIN' || isOwner;
  const isManager = user?.role === 'MANAGER';

  return {
    isAdmin,
    isManager,

    // uprawnienia dotyczące zarządzania firmą
    canUpdateCompany: isAdmin,

    // uprawnienia dotyczące zarządzania zespołem
    canManageTeam: isAdmin,
    canInviteUsers: isAdmin,
    canEditUsers: isAdmin,
    canDeleteUsers: isAdmin,

    // uprawnienia dotyczące zarządzania kierowcami
    canDeleteDrivers: isAdmin,

    // uprawnienia dotyczące zarządzania pojazdami
    canAddVehicle: isAdmin || isManager,
    canEditVehicle: isAdmin || isManager,
    canDeleteVehicle: isAdmin || isManager,

    // tylko admin zarządza listą managerów przypisanych do pojazdu
    canManageVehicleManagers: isAdmin,
  };
};
