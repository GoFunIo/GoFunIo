import { useUser } from './user.hooks';

export const usePermissions = () => {
  const { data: user } = useUser();

  const isOwner = user?.role === 'OWNER';
  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER';

  return {
    isAdmin,
    isManager,
    isOwner,

    // uprawnienia dotyczące zarządzania firmą
    canUpdateCompany: isOwner,

    // uprawnienia dotyczące zarządzania zespołem
    canManageUsers: isOwner || isAdmin,
    canChangeRole: isOwner,
    canInviteUsers: isOwner || isAdmin,
    canEditUsers: isOwner || isAdmin,
    canDeleteUsers: isOwner || isAdmin,

    // uprawnienia dotyczące zarządzania kierowcami
    canDeleteDrivers: isOwner || isAdmin,

    // uprawnienia dotyczące zarządzania pojazdami
    canAddVehicle: isOwner || isAdmin || isManager,
    canEditVehicle: isOwner || isAdmin || isManager,
    canDeleteVehicle: isOwner || isAdmin || isManager,

    // tylko admin zarządza listą managerów przypisanych do pojazdu
    canManageVehicleManagers: isOwner || isAdmin,
  };
};
