/**
 * AgriConnect Telephony Call API Service
 * Handles mobile outbound calling requests and call history.
 */

import api from './api';

export interface InitiateCallResponse {
  success: boolean;
  message: string;
  data: {
    callId: string;
    status: string;
    createdAt: string;
  };
}

export interface CallHistoryRecord {
  _id: string;
  caller: {
    _id: string;
    name: string;
    role: string;
    profileImage?: string;
  };
  receiver: {
    _id: string;
    name: string;
    role: string;
    profileImage?: string;
  };
  workerProfile?: {
    _id: string;
    title: string;
    skills: string[];
    rating: number;
  };
  provider: string;
  status: string;
  duration: number;
  startedAt: string;
  endedAt?: string;
  createdAt: string;
}

/**
 * Initiate a real telecom phone call to a worker's registered mobile number
 * @param workerId - WorkerProfile ID or Worker User ID
 */
export const initiateMobileCall = async (workerId: string): Promise<InitiateCallResponse> => {
  if (import.meta.env.NODE_ENV !== 'production') {
    console.log(`Calling worker: ${workerId}`);
    console.log('Calling endpoint: /calls/mobile');
  }

  // Uses baseURL ('http://localhost:5000/api/v1') + '/calls/mobile' = '/api/v1/calls/mobile'
  const response = await api.post<InitiateCallResponse>('/calls/mobile', {
    workerId,
  });
  return response.data;
};

/**
 * Fetch authenticated user's telecom call history
 */
export const getCallHistory = async (): Promise<CallHistoryRecord[]> => {
  // Uses baseURL ('http://localhost:5000/api/v1') + '/calls/history' = '/api/v1/calls/history'
  const response = await api.get<{ success: boolean; data: CallHistoryRecord[] }>('/calls/history');
  return response.data.data;
};
