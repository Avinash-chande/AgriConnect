import api from './api';

export interface AppNotification {
  _id: string;
  recipient: string;
  sender?: {
    _id: string;
    name: string;
    profileImage?: string;
    role?: string;
  };
  type:
    | 'application.applied'
    | 'application.accepted'
    | 'application.rejected'
    | 'application.shortlisted'
    | 'application.withdrawn'
    | 'application.cancelled'
    | 'application.hired'
    | 'system';
  title: string;
  message: string;
  resource?: {
    kind?: 'Application' | 'Job' | 'User';
    id?: string;
  };
  meta?: {
    icon?: string;
    color?: string;
    jobTitle?: string;
    applicationId?: string;
    jobId?: string;
    reason?: string;
    [key: string]: any;
  };
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GetNotificationsParams {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
  type?: string;
}

export const getNotifications = async (
  params?: GetNotificationsParams
): Promise<{
  notifications: AppNotification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  unreadCount: number;
}> => {
  const response = await api.get('/notifications', { params });
  return {
    notifications: response.data.data,
    pagination: response.data.meta?.pagination || {},
    unreadCount: response.data.meta?.unreadCount || 0,
  };
};

export const getUnreadCount = async (): Promise<number> => {
  const response = await api.get('/notifications/unread-count');
  return response.data.data?.count || 0;
};

export const markNotificationRead = async (notificationId: string): Promise<AppNotification> => {
  const response = await api.patch(`/notifications/${notificationId}/read`);
  return response.data.data;
};

export const markAllNotificationsRead = async (): Promise<{ modifiedCount: number }> => {
  const response = await api.patch('/notifications/read-all');
  return response.data.data;
};

export const deleteNotification = async (notificationId: string): Promise<void> => {
  await api.delete(`/notifications/${notificationId}`);
};
