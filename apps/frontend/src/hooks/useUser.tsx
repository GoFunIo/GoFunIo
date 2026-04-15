import { useQuery } from '@tanstack/react-query';
import { getUser } from 'src/api/auth';

export const useUser = () => {
  return useQuery({
    queryKey: ['me'],
    queryFn: getUser,
    retry: false,
    staleTime: 0,
  });
};
