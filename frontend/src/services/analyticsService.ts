import { api } from './api';

export interface HomeStatistics {
  verifiedFarmWorkers: number;
  activeFarmOwners: number;
  successfulJobMatches: number;
  successfulFarmJobsThisMonth: number;
  averageMatchTimeHours: number | null;
  badges: {
    verifiedWorkersBadge?: string;
    activeFarmersBadge?: string;
    successfulMatchesBadge?: string;
    averageMatchTimeBadge?: string;
  };
}

/**
 * Fetch real aggregate statistics for the /home landing page cards.
 * Public endpoint: works for both logged-out visitors and logged-in users.
 */
export const getHomeStatisticsApi = async (): Promise<HomeStatistics> => {
  const response = await api.get('/analytics/home-stats');
  return response.data?.data;
};
