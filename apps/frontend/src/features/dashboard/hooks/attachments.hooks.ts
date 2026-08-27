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

// export const useDownloadServiceAttachment = () => {
//   return useMutation({
//     mutationFn: async ({
//       serviceId,
//       attachmentId,
//       fileName,
//     }: {
//       serviceId: string;
//       attachmentId: string;
//       fileName: string;
//     }) => {
//       const blob = await downloadServiceAttachment(
//         serviceId,
//         attachmentId,
//       );

//       const url = window.URL.createObjectURL(blob);

//       const link = document.createElement('a');
//       link.href = url;
//       link.download = fileName;

//       document.body.appendChild(link);
//       link.click();
//       link.remove();

//       window.URL.revokeObjectURL(url);
//     },
//   });
// };

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
