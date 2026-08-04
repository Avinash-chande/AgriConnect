import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Send,
  CheckCircle2,
  XCircle,
  Star,
  LogOut,
  Ban,
  Briefcase,
  Info,
  Clock,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '../../services/notificationService';
import type { AppNotification } from '../../services/notificationService';

// Event Icon & Style Mapper
const getNotificationStyle = (type: string) => {
  switch (type) {
    case 'application.applied':
      return { Icon: Send, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-100' };
    case 'application.accepted':
      return { Icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' };
    case 'application.hired':
      return { Icon: Briefcase, color: 'text-emerald-700', bg: 'bg-emerald-100 border-emerald-200' };
    case 'application.rejected':
      return { Icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-100' };
    case 'application.shortlisted':
      return { Icon: Star, color: 'text-amber-500', bg: 'bg-amber-50 border-amber-100' };
    case 'application.withdrawn':
      return { Icon: LogOut, color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200' };
    case 'application.cancelled':
      return { Icon: Ban, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-100' };
    default:
      return { Icon: Info, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' };
  }
};

const timeAgo = (dateString: string) => {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
};

export const NotificationDropdown: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch Unread Count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch {
      // Quiet fallback
    }
  }, []);

  // Fetch Notification List
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getNotifications({
        limit: 15,
        unreadOnly: activeTab === 'unread',
      });
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch {
      // Quiet fallback
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  // Initial load + periodic poll (every 30 seconds for live updates)
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Fetch full list when dropdown opens or tab changes
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handlers
  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Fail silently
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // Fail silently
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      fetchUnreadCount();
    } catch {
      // Fail silently
    }
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.isRead) {
      await handleMarkAsRead(notif._id);
    }
    setIsOpen(false);

    // Contextual routing based on resource or role
    if (notif.meta?.applicationId || notif.resource?.id) {
      // If user is a worker or notification is worker-facing
      if (
        [
          'application.accepted',
          'application.rejected',
          'application.shortlisted',
          'application.cancelled',
          'application.hired',
        ].includes(notif.type)
      ) {
        navigate('/my-applications');
      } else {
        navigate('/farmer/applications');
      }
    } else if (notif.meta?.jobId) {
      navigate(`/jobs/${notif.meta.jobId}`);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-2xl bg-slate-100/80 hover:bg-slate-200/80 text-slate-600 hover:text-slate-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />

        {/* Unread Counter Badge */}
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 px-1.5 py-0.5 min-w-[20px] h-[20px] bg-emerald-600 text-white font-black text-[10px] rounded-full flex items-center justify-center border-2 border-white shadow-sm"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Popover Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-3xl border border-slate-100 shadow-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-extrabold bg-emerald-500/30 text-emerald-300 rounded-full border border-emerald-500/30">
                    {unreadCount} unread
                  </span>
                )}
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-xs font-semibold text-slate-300 hover:text-emerald-400 flex items-center gap-1 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex border-b border-slate-100 bg-slate-50/50 px-5 pt-2 gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`pb-2 px-3 text-xs font-bold transition-all relative ${
                  activeTab === 'all' ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All
                {activeTab === 'all' && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 inset-x-0 h-0.5 bg-emerald-500 rounded-full"
                  />
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('unread')}
                className={`pb-2 px-3 text-xs font-bold transition-all relative ${
                  activeTab === 'unread' ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Unread
                {activeTab === 'unread' && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 inset-x-0 h-0.5 bg-emerald-500 rounded-full"
                  />
                )}
              </button>
            </div>

            {/* Notification List */}
            <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-50">
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                  <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <span>Loading updates...</span>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-2">
                  <Sparkles className="w-8 h-8 text-slate-200" />
                  <p className="text-xs font-semibold text-slate-600">No notifications yet</p>
                  <p className="text-[11px] text-slate-400">
                    {activeTab === 'unread' ? 'You have no unread notifications.' : 'Activity updates will appear here.'}
                  </p>
                </div>
              ) : (
                notifications.map((notif) => {
                  const { Icon, color, bg } = getNotificationStyle(notif.type);
                  return (
                    <div
                      key={notif._id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-4 flex items-start gap-3 transition-colors cursor-pointer group ${
                        notif.isRead ? 'bg-white hover:bg-slate-50/80' : 'bg-emerald-50/30 hover:bg-emerald-50/60'
                      }`}
                    >
                      {/* Icon */}
                      <div className={`p-2 rounded-2xl border shrink-0 ${bg}`}>
                        <Icon className={`w-4 h-4 ${color}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <h4
                            className={`text-xs truncate ${
                              notif.isRead ? 'font-semibold text-slate-800' : 'font-bold text-slate-900'
                            }`}
                          >
                            {notif.title}
                          </h4>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">
                            {timeAgo(notif.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {notif.message}
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        {!notif.isRead && (
                          <button
                            type="button"
                            onClick={(e) => handleMarkAsRead(notif._id, e)}
                            title="Mark read"
                            className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleDelete(notif._id, e)}
                          title="Delete"
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
              <span className="text-[11px] font-semibold text-slate-400">
                Real-time updates enabled
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
