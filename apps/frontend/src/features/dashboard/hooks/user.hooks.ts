import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { changeUserSettings, getUser } from '../api/user.api';

export const useUser = () => {
  return useQuery({
    queryKey: ['me'],
    queryFn: getUser,
    retry: false,
    staleTime: Infinity,
  });
};

export const useChangeUserSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: changeUserSettings,

    onSuccess: (user) => {
      queryClient.setQueryData(['me'], user);
    },
  });
};
