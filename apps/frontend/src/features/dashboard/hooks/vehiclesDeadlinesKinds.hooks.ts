import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getDeadlinesKinds,
  createDeadlineKind,
  renameDeadlineKind,
  deleteDeadlineKind,
} from '../api/vehiclesDeadlinesKinds.api';

import { CreateDeadlineKindData, RenameDeadlineKindData } from '../types/DeadlinesKindsTypes';

export const DEADLINES_KINDS_QUERY_KEY = ['deadlines-kinds'];

export const useDeadlinesKinds = () => {
  return useQuery({
    queryKey: DEADLINES_KINDS_QUERY_KEY,
    queryFn: getDeadlinesKinds,
    staleTime: Infinity,
  });
};

// POST /vehicle-deadline-kinds
export const useCreateDeadlineKind = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: CreateDeadlineKindData) => createDeadlineKind(formData),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: DEADLINES_KINDS_QUERY_KEY,
      });
    },
  });
};

// PATCH /vehicle-deadline-kinds/:id
export const useRenameDeadlineKind = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: RenameDeadlineKindData }) =>
      renameDeadlineKind(id, formData),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: DEADLINES_KINDS_QUERY_KEY,
      });
    },
  });
};

// DELETE /vehicle-deadline-kinds/:id
export const useDeleteDeadlineKind = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteDeadlineKind(id),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: DEADLINES_KINDS_QUERY_KEY,
      });
    },
  });
};
