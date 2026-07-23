import { getTeam } from '@/features/dashboard/api/team.api';
import { useQuery } from '@tanstack/react-query';
import { useUser } from './useUser';

export const useTeam = () => {
  const { data: user } = useUser();

  return useQuery({
    queryKey: ['team'],
    queryFn: getTeam,
    enabled: user?.role === 'ADMIN',
  });
};
