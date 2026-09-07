import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createServiceAttachment,
  deleteServiceAttachment,
  updateServiceAttachment,
} from '../api/attachments.api';

export const useCreateServiceAttachment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ serviceId, file }: { serviceId: string; file: File }) =>
      createServiceAttachment(serviceId, file),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['service', variables.serviceId],
      });

      queryClient.invalidateQueries({
        queryKey: ['services'],
      });
    },
  });
};

export const useUpdateServiceAttachment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      serviceId,
      attachmentId,
      file,
    }: {
      serviceId: string;
      attachmentId: string;
      file: File;
    }) => updateServiceAttachment(serviceId, attachmentId, file),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['service', variables.serviceId],
      });

      queryClient.invalidateQueries({
        queryKey: ['services'],
      });
    },
  });
};

export const useDeleteServiceAttachment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ serviceId, attachmentId }: { serviceId: string; attachmentId: string }) =>
      deleteServiceAttachment(serviceId, attachmentId),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['service', variables.serviceId],
      });

      queryClient.invalidateQueries({
        queryKey: ['services'],
      });
    },
  });
};
