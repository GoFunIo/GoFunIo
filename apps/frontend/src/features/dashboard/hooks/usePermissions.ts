import { useUser } from './user.hooks';

export const usePermissions = () => {
  const { data: user } = useUser();

  const isAdmin = user?.role === 'ADMIN';
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
  };
};
