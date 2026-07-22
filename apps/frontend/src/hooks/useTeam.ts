import { getTeam } from '@/features/dashboard/api/team.api';
import { useQuery } from '@tanstack/react-query';

export const useTeam = () => {
  return useQuery({
    queryKey: ['team'],
    queryFn: getTeam,
  });
};
