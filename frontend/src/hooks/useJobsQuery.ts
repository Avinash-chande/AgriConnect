import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobService } from '../services/jobService';
import type { JobData } from '../services/jobService';
import { applyForJob } from '../services/applicationService';
import type { ApplyJobPayload } from '../services/applicationService';

export const useJobs = (params?: Record<string, any>) => {
  return useQuery({
    queryKey: ['jobs', params],
    queryFn: () => jobService.getAllJobs(params),
  });
};

export const useFarmerJobs = (params?: { page?: number; limit?: number; status?: string }) => {
  return useQuery({
    queryKey: ['farmerJobs', params],
    queryFn: () => jobService.getFarmerDashboardJobs(params),
  });
};

export const useJobDetails = (jobId: string) => {
  return useQuery({
    queryKey: ['job', jobId],
    queryFn: () => jobService.getJobById(jobId),
    enabled: !!jobId,
  });
};

export const useCreateJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (jobData: FormData | Partial<JobData>) => jobService.createJob(jobData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['farmerJobs'] });
    },
  });
};

export const useApplyJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ jobId, payload }: { jobId: string; payload: ApplyJobPayload }) => applyForJob(jobId, payload),
    onSuccess: (_, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['myApplications'] });
    },
  });
};
