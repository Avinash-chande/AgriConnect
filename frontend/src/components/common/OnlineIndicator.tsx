import React, { useEffect } from 'react';
import { usePresence } from '../../hooks/usePresence';

interface OnlineIndicatorProps {
  userId: string;
  isOnlineOverride?: boolean;
  lastSeenOverride?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Format Last Seen Timestamp into Human-readable String
 */
export const formatLastSeenText = (lastSeenDate?: string): string => {
  if (!lastSeenDate) return 'Offline';
  const date = new Date(lastSeenDate);
  const now = new Date();

  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));

  if (diffMins < 1) return 'Last seen just now';
  if (diffMins < 60) return `Last seen ${diffMins} ${diffMins === 1 ? 'min' : 'mins'} ago`;

  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (isToday) return `Last seen today at ${timeStr}`;
  if (isYesterday) return `Last seen Yesterday at ${timeStr}`;

  return `Last seen ${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}`;
};

export const OnlineIndicator: React.FC<OnlineIndicatorProps> = ({
  userId,
  isOnlineOverride,
  lastSeenOverride,
  showText = true,
  size = 'md',
  className = '',
}) => {
  const { presenceMap, isUserOnline, getUserLastSeen, fetchUserPresence } = usePresence();

  useEffect(() => {
    if (userId && !presenceMap[userId] && isOnlineOverride === undefined) {
      fetchUserPresence(userId);
    }
  }, [userId, isOnlineOverride]);

  const isOnline = isOnlineOverride !== undefined ? isOnlineOverride : isUserOnline(userId);
  const lastSeen = lastSeenOverride || getUserLastSeen(userId);

  const dotSizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3.5 h-3.5',
  };

  return (
    <div className={`inline-flex items-center space-x-1.5 ${className}`}>
      {isOnline ? (
        <>
          <span className="relative flex">
            <span className={`${dotSizeClasses[size]} rounded-full bg-emerald-400 animate-ping absolute opacity-75`} />
            <span className={`${dotSizeClasses[size]} rounded-full bg-emerald-500 relative`} />
          </span>
          {showText && <span className="text-xs text-emerald-400 font-semibold">Online</span>}
        </>
      ) : (
        <>
          <span className={`${dotSizeClasses[size]} rounded-full bg-slate-600 opacity-60 inline-block`} />
          {showText && (
            <span className="text-xs text-slate-400 font-medium">
              {formatLastSeenText(lastSeen)}
            </span>
          )}
        </>
      )}
    </div>
  );
};
