import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAllServices,
  getService,
  createService,
  updateService,
  deleteService,
} from '../api/services.api';
import { AddServiceFormData } from '../lib/formValidationRules';
import { ServiceListParams } from '../types/ServiceTypes';
import { createServiceAttachment } from '../api/attachments.api';

// =========================================================================
// POBIERANIE LISTY USŁUG  GET /services
// =========================================================================

export const useServices = (params?: ServiceListParams) => {
  return useQuery({
    queryKey: ['services', 'list', params],
    queryFn: () => getAllServices(params),
    staleTime: 1000 * 60 * 5,
  });
};

// =========================================================================
// POBIERANIE POJEDYNCZEJ USŁUGI   GET /services/{id}
// =========================================================================

export const useService = (id?: string) => {
  return useQuery({
    queryKey: ['services', id],
    queryFn: () => getService(id!),
    enabled: !!id,
    retry: false,
  });
};

// =========================================================================
// TWORZENIE USŁUGI  POST /services
// =========================================================================

export const useCreateService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: AddServiceFormData) => {
      const { attachments, ...serviceData } = formData;

      const service = await createService(serviceData);

      if (attachments?.length) {
        await Promise.all(
          attachments
            .filter((attachment) => attachment.file)
            .map((attachment) => createServiceAttachment(service.id, attachment.file!)),
        );
      }

      return service;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['services'],
      });
    },
  });
};

// =========================================================================
// AKTUALIZACJA USŁUGI  PATCH /services/{id}
// =========================================================================

export const useUpdateService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, form }: { id: string; form: AddServiceFormData }) => updateService(id, form),

    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.refetchQueries({
          queryKey: ['services'],
        }),
        queryClient.refetchQueries({
          queryKey: ['services', variables.id],
        }),
      ]);
    },
  });
};

// =========================================================================
// USUWANIE USŁUGI  DELETE /services/{id}
// =========================================================================

export const useDeleteService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteService(id),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['services'],
      });
    },
  });
};
