import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  Users,
  Search,
  Clock,
  Sparkles,
  TrendingUp,
  Briefcase,
  Zap,
  BarChart3,
  ChevronRight,
} from 'lucide-react';
import { useConversations, useUnreadChatCount } from '../hooks/useChatQuery';
import { useSocket } from '../hooks/useSocket';
import { usePresence } from '../hooks/usePresence';
import type { ConversationData } from '../services/chatService';
import { ModernChatInterface } from '../components/chat/ModernChatInterface';
import { ConversationCard } from '../components/chat/ConversationCard';
import { OnlineIndicator } from '../components/common/OnlineIndicator';
import { useAuth } from '../context/AuthContext';

// Quick Reply Template Presets for Farmers
const QUICK_REPLIES = [
  '👋 Hello! Thanks for applying to our farm job.',
  '📅 Are you available to start work this week?',
  '💰 The offered daily wage is ₹600 with lunch provided.',
  '📍 Farm location: Green Valley Acres, Sector 4.',
  '🚜 Please share your previous farming experience.',
  '⏰ Work begins tomorrow at 7:00 AM sharp.',
];

// Mock Chart Data for Message Volume Breakdown
const WEEKLY_ACTIVITY = [
  { day: 'Mon', sent: 12, received: 18 },
  { day: 'Tue', sent: 19, received: 24 },
  { day: 'Wed', sent: 15, received: 20 },
  { day: 'Thu', sent: 22, received: 28 },
  { day: 'Fri', sent: 30, received: 35 },
  { day: 'Sat', sent: 25, received: 31 },
  { day: 'Sun', sent: 18, received: 22 },
];

export const FarmerChatDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { onlineUserIds } = useSocket();
  const { presenceMap } = usePresence();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<ConversationData | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');

  const { data, isLoading } = useConversations();
  const { data: unreadTotal = 0 } = useUnreadChatCount();

  const conversations: ConversationData[] = data?.conversations || [];
  const currentUserId = user?._id || '';

  // Filter Conversations by Search Query & Unread Filter
  const filteredConversations = conversations.filter((conv) => {
    const workerName = conv.worker?.name || '';
    const jobTitle = conv.job?.title || '';
    const lastMsg = conv.lastMessageText || '';

    const matchesSearch =
      !searchQuery.trim() ||
      workerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lastMsg.toLowerCase().includes(searchQuery.toLowerCase());

    const isUnread = conv.unreadCount?.farmer > 0;
    const matchesTab = activeTab === 'all' || isUnread;

    return matchesSearch && matchesTab;
  });

  // Calculate Online Workers in Farmer's Conversations
  const onlineWorkersList = conversations.filter((conv) => {
    const workerId = conv.worker?._id;
    return workerId && (onlineUserIds.includes(workerId) || presenceMap[workerId]?.isOnline);
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Dashboard Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-3xl shadow-2xl backdrop-blur-md">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Farmer Communication Hub</h1>
              <span className="text-xs font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Farmer Dashboard
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Manage applicant inquiries, real-time chats, and worker notifications seamlessly.
            </p>
          </div>
        </div>

        {/* Global Search Input */}
        <div className="relative min-w-[260px] sm:min-w-[320px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search candidates, jobs, or messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all shadow-inner"
          />
        </div>
      </div>

      {/* KPI Overview Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Conversations */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-slate-900/90 border border-slate-800 p-5 rounded-3xl shadow-xl flex items-center justify-between"
        >
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Threads</p>
            <h3 className="text-2xl font-black text-white mt-1">{conversations.length}</h3>
            <p className="text-[11px] text-emerald-400 font-semibold mt-1 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1 inline" /> 100% Response Capability
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-950/80 border border-indigo-800/60 flex items-center justify-center text-indigo-400">
            <Users className="w-6 h-6" />
          </div>
        </motion.div>

        {/* Unread Messages */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-slate-900/90 border border-slate-800 p-5 rounded-3xl shadow-xl flex items-center justify-between"
        >
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Unread Messages</p>
            <h3 className="text-2xl font-black text-emerald-400 mt-1">{unreadTotal}</h3>
            <p className="text-[11px] text-slate-400 font-medium mt-1">Pending farmer responses</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
            <MessageSquare className="w-6 h-6" />
          </div>
        </motion.div>

        {/* Online Workers */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-slate-900/90 border border-slate-800 p-5 rounded-3xl shadow-xl flex items-center justify-between"
        >
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Online Applicants</p>
            <h3 className="text-2xl font-black text-cyan-400 mt-1">{onlineWorkersList.length}</h3>
            <p className="text-[11px] text-cyan-400 font-semibold mt-1 flex items-center">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping mr-1.5" /> Ready to Chat
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
            <Zap className="w-6 h-6" />
          </div>
        </motion.div>

        {/* Avg Response Time */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-slate-900/90 border border-slate-800 p-5 rounded-3xl shadow-xl flex items-center justify-between"
        >
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Response Time</p>
            <h3 className="text-2xl font-black text-amber-400 mt-1">&lt; 5 mins</h3>
            <p className="text-[11px] text-slate-400 font-medium mt-1">Real-time Socket.IO connected</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-950/80 border border-amber-800/60 flex items-center justify-center text-amber-400">
            <Clock className="w-6 h-6" />
          </div>
        </motion.div>
      </div>

      {/* Main Split Grid Layout: Conversations & Live Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[680px]">
        {/* Left Column: Recent Conversation List (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header Tabs */}
          <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center">
              <MessageSquare className="w-4 h-4 mr-2 text-emerald-400" /> Recent Conversations
            </h3>

            <div className="flex space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                  activeTab === 'all'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab('unread')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                  activeTab === 'unread'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Unread
              </button>
            </div>
          </div>

          {/* Conversations Thread List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
                <p>Loading candidate conversations...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-slate-500 flex flex-col items-center">
                <Sparkles className="w-8 h-8 text-slate-600 mb-2" />
                <p className="text-xs font-semibold text-slate-300">No conversations found</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {searchQuery ? 'Try matching candidate name or job title' : 'Applicants will appear here once they apply'}
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = selectedConversation?._id === conv._id;
                const workerId = conv.worker?._id;
                const isWorkerOnline = workerId ? (onlineUserIds.includes(workerId) || presenceMap[workerId]?.isOnline) : false;

                return (
                  <ConversationCard
                    key={conv._id}
                    conversation={conv}
                    isSelected={isSelected}
                    isOnline={isWorkerOnline}
                    unreadCount={conv.unreadCount?.farmer || 0}
                    currentUserId={currentUserId}
                    userRole="farmer"
                    searchQuery={searchQuery}
                    onSelect={(c) => setSelectedConversation(c)}
                  />
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Live Chat Interface Window (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
          {selectedConversation ? (
            <ModernChatInterface conversation={selectedConversation} />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 rounded-3xl bg-slate-950 border border-slate-800 flex items-center justify-center text-emerald-400 mb-4 shadow-inner">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white">Select a candidate conversation</h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Click on any candidate thread on the left pane to view message history, send attachments, or use quick reply templates.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Reply Presets & Active Online Workers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Quick Reply Preset Bar (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 p-5 rounded-3xl shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center">
              <Zap className="w-4 h-4 mr-2 text-amber-400" /> Quick Response Templates
            </h3>
            <span className="text-[11px] text-slate-400">One-tap messaging</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {QUICK_REPLIES.map((text, idx) => (
              <button
                key={idx}
                onClick={() => {
                  if (selectedConversation) {
                    // Copy to clipboard or trigger notification
                    navigator.clipboard.writeText(text);
                    alert(`Copied template: "${text}"`);
                  } else {
                    alert('Please select a candidate conversation first to use quick reply!');
                  }
                }}
                className="text-left p-3 rounded-2xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 text-xs text-slate-300 hover:text-white transition-all shadow-sm flex items-center justify-between group"
              >
                <span className="truncate pr-2">{text}</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Active Online Applicant Workers Grid (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 p-5 rounded-3xl shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center">
              <Users className="w-4 h-4 mr-2 text-cyan-400" /> Online Applicant Workers
            </h3>
            <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800">
              {onlineWorkersList.length} Active
            </span>
          </div>

          <div className="max-h-44 overflow-y-auto space-y-2 pr-1">
            {onlineWorkersList.length === 0 ? (
              <div className="text-center text-xs text-slate-500 py-6">
                No applicants are currently online
              </div>
            ) : (
              onlineWorkersList.map((conv) => {
                const worker = conv.worker;
                return (
                  <div
                    key={conv._id}
                    onClick={() => setSelectedConversation(conv)}
                    className="p-2.5 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-emerald-500/50 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600/30 to-teal-800/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs">
                        {worker?.name ? worker.name.charAt(0).toUpperCase() : 'W'}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">{worker?.name}</h4>
                        <p className="text-[10px] text-emerald-400 flex items-center">
                          <Briefcase className="w-2.5 h-2.5 mr-1 inline" /> {conv.job?.title}
                        </p>
                      </div>
                    </div>

                    <OnlineIndicator userId={worker._id} showText={false} size="sm" />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Message Activity & Weekly Analytics Chart */}
      <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Weekly Communication Analytics</h3>
          </div>
          <span className="text-xs text-slate-400">Messages Sent vs Received</span>
        </div>

        {/* SVG/Framer Motion Weekly Bar Chart */}
        <div className="h-44 flex items-end justify-between gap-2 pt-6 px-4 bg-slate-950/60 rounded-2xl border border-slate-800/80">
          {WEEKLY_ACTIVITY.map((item, index) => (
            <div key={index} className="flex-1 flex flex-col items-center space-y-2 h-full justify-end">
              <div className="w-full flex justify-center space-x-1.5 items-end h-32">
                {/* Sent Messages Bar */}
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(item.sent / 40) * 100}%` }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                  className="w-3 bg-emerald-500 rounded-t-md hover:bg-emerald-400 transition-colors"
                  title={`Sent: ${item.sent}`}
                />
                {/* Received Messages Bar */}
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(item.received / 40) * 100}%` }}
                  transition={{ duration: 0.5, delay: index * 0.05 + 0.1 }}
                  className="w-3 bg-cyan-500 rounded-t-md hover:bg-cyan-400 transition-colors"
                  title={`Received: ${item.received}`}
                />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">{item.day}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center space-x-6 text-xs text-slate-400 pt-2">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded bg-emerald-500 inline-block" />
            <span>Messages Sent</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded bg-cyan-500 inline-block" />
            <span>Messages Received</span>
          </div>
        </div>
      </div>
    </div>
  );
};
