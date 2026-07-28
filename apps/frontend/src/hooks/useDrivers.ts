import { getDrivers } from '@/features/dashboard/api/drivers.api';
import { useQuery } from '@tanstack/react-query';

export const useDrivers = () => {
  return useQuery({
    queryKey: ['drivers'],
    queryFn: getDrivers,
  });
};
