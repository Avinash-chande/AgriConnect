import { api } from './api';
import type { WorkerProfile } from '../types';

export interface WorkerSearchParams {
  search?: string;
  keyword?: string;
  location?: string;
  category?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

export interface WorkerSearchPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface WorkerSearchResponse {
  workers: WorkerProfile[];
  pagination: WorkerSearchPagination;
}

/**
 * Public Worker Search API (read-only discovery, no login required)
 */
export const searchWorkersApi = async (
  params: WorkerSearchParams = {}
): Promise<WorkerSearchResponse> => {
  const cleanParams: Record<string, any> = {};

  if (params.search && params.search.trim()) {
    cleanParams.search = params.search.trim();
  } else if (params.keyword && params.keyword.trim()) {
    cleanParams.search = params.keyword.trim();
  }

  if (
    params.location &&
    params.location.trim() &&
    params.location.toLowerCase() !== 'all locations' &&
    params.location.toLowerCase() !== 'all'
  ) {
    cleanParams.location = params.location.trim();
  }

  if (
    params.category &&
    params.category.trim() &&
    params.category.toLowerCase() !== 'all categories' &&
    params.category.toLowerCase() !== 'all'
  ) {
    cleanParams.category = params.category.trim();
  }

  if (params.page) cleanParams.page = params.page;
  if (params.limit) cleanParams.limit = params.limit;
  if (params.sort) cleanParams.sort = params.sort;

  const response = await api.get('/workers/search', { params: cleanParams });
  return response.data.data;
};
