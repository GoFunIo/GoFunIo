import { getUser } from '@/features/auth/auth.api';
import { useQuery } from '@tanstack/react-query';

export const useUser = () => {
  return useQuery({
    queryKey: ['me'],
    queryFn: getUser,
    retry: false,
    staleTime: 0,
  });
};
