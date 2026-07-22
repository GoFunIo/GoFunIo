import { getCompany } from '@/features/dashboard/api/company.api';
import { useQuery } from '@tanstack/react-query';

export const useCompany = () => {
  return useQuery({
    queryKey: ['company'],
    queryFn: getCompany,
  });
};
