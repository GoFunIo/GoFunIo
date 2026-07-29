import { changeCompanyInfo, getCompany } from '@/features/dashboard/api/company.api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// get user's company

export const useCompany = () => {
  return useQuery({
    queryKey: ['company'],
    queryFn: getCompany,
  });
};

// change company settings

export const useChangeCompanyInfo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: changeCompanyInfo,

    onSuccess: (company) => {
      queryClient.setQueryData(['company'], company);
    },
  });
};
