import {
  changeTeamMember,
  deleteTeamMember,
  getTeam,
  inviteTeamMember,
} from '@/features/dashboard/api/team.api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from './user.hooks';

// get all users which have account ( admins and managers ) in your company

export const useTeam = () => {
  const { data: user } = useUser();

  return useQuery({
    queryKey: ['team'],
    queryFn: getTeam,
    enabled: user?.role === 'ADMIN',
  });
};

// invite new user in your team

export const useInviteTeamMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: inviteTeamMember,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['team'],
      });
    },
  });
};

// edit your company's user

export const useChangeTeamMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: changeTeamMember,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['team'],
      });
    },
  });
};

// delete team member

export const useDeleteTeamMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTeamMember,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['team'],
      });
    },
  });
};
