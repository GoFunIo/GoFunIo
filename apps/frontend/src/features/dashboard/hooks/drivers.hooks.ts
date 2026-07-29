import {
  addDriver,
  changeDriver,
  deleteDriver,
  getDrivers,
} from '@/features/dashboard/api/drivers.api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// get your drivers ( only records without any accounts )

export const useDrivers = () => {
  return useQuery({
    queryKey: ['drivers'],
    queryFn: getDrivers,
  });
};

// add your driver

export const useAddDriver = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addDriver,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['drivers'],
      });
    },
  });
};

// edit driver

export const useChangeDriver = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: changeDriver,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['drivers'],
      });
    },
  });
};

// delete driver

export const useDeleteDriver = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteDriver,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['drivers'],
      });
    },
  });
};
