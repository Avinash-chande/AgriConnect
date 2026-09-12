import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMyApplications,
  getFarmerApplications,
  acceptApplication,
  rejectApplication,
  toggleShortlistApplication,
  withdrawApplication,
} from '../services/applicationService';
import type { GetApplicationsQueryParams } from '../services/applicationService';

export const useMyApplications = (params?: GetApplicationsQueryParams) => {
  return useQuery({
    queryKey: ['myApplications', params],
    queryFn: () => getMyApplications(params),
  });
};

export const useFarmerApplications = (params?: GetApplicationsQueryParams) => {
  return useQuery({
    queryKey: ['farmerApplications', params],
    queryFn: () => getFarmerApplications(params),
  });
};

export const useAcceptApplication = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      applicationId,
      payload,
    }: {
      applicationId: string;
      payload?: { farmerFeedback?: string; rejectOthers?: boolean; rejectionFeedback?: string };
    }) => acceptApplication(applicationId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farmerApplications'] });
      queryClient.invalidateQueries({ queryKey: ['farmerJobs'] });
    },
  });
};

export const useRejectApplication = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ applicationId, reason }: { applicationId: string; reason?: string }) =>
      rejectApplication(applicationId, reason ? { reason } : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farmerApplications'] });
    },
  });
};

export const useToggleShortlistApplication = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (applicationId: string) => toggleShortlistApplication(applicationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farmerApplications'] });
    },
  });
};

export const useWithdrawApplication = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (applicationId: string) => withdrawApplication(applicationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myApplications'] });
    },
  });
};
