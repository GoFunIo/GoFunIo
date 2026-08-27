import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAllServices,
  getService,
  createService,
  updateService,
  deleteService,
} from '../api/services.api';
import { AddServiceFormData } from '../lib/formValidationRules';
import { ServiceListParams, SingleServiceData } from '../types/ServiceTypes';
import {
  createServiceAttachment,
  deleteServiceAttachment,
  updateServiceAttachment,
} from '../api/attachments.api';

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

export const useService = (id?: string | null) => {
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
    mutationFn: async ({
      service,
      formData,
    }: {
      service: SingleServiceData;
      formData: AddServiceFormData;
    }) => {
      const { attachments, ...serviceData } = formData;

      const updatedService = await updateService(service.id, serviceData);

      const currentIds = new Set(attachments?.filter((a) => a.id).map((a) => a.id));

      await Promise.all(
        service.attachments
          .filter((a) => a.id && !currentIds.has(a.id))
          .map((a) => deleteServiceAttachment(updatedService.id, a.id!)),
      );

      await Promise.all(
        attachments
          ?.filter((a) => a.file)
          .map((a) =>
            a.id
              ? updateServiceAttachment(updatedService.id, a.id, a.file!)
              : createServiceAttachment(updatedService.id, a.file!),
          ) ?? [],
      );

      return updatedService;
    },

    onSuccess: (_, { service }) => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['service', service.id] });
    },
  });
};

// =========================================================================
// USUWANIE USŁUGI  DELETE /services/{id}
// =========================================================================

export const useDeleteService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteService,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['services'],
      });
    },
  });
};
