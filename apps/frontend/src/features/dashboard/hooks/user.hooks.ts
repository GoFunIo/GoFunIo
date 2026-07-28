import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { changeUserSettings, getUser } from '../api/user.api';

// get user ( your account )

export const useUser = () => {
  return useQuery({
    queryKey: ['me'],
    queryFn: getUser,
    retry: false,
    staleTime: 0,
  });
};

// change user settings

export const useChangeUserSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: changeUserSettings,

    onSuccess: (user) => {
      queryClient.setQueryData(['me'], user);
    },
  });
};
