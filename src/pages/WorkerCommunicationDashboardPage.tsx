import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  Users,
  Search,
  CheckCircle2,
  Sparkles,
  Briefcase,
  Zap,
  ChevronRight,
  ShieldCheck,
  CheckCircle,
  MapPin,
  IndianRupee,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { useConversations, useUnreadChatCount } from '../hooks/useChatQuery';
import { useMyApplications } from '../hooks/useApplicationsQuery';
import { useJobs } from '../hooks/useJobsQuery';
import { useSocket } from '../hooks/useSocket';
import { usePresence } from '../hooks/usePresence';
import type { ConversationData } from '../services/chatService';
import { ModernChatInterface } from '../components/chat/ModernChatInterface';
import { ConversationCard } from '../components/chat/ConversationCard';
import { OnlineIndicator } from '../components/common/OnlineIndicator';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const WorkerCommunicationDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { onlineUserIds } = useSocket();
  const { presenceMap } = usePresence();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<ConversationData | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');

  const { data, isLoading } = useConversations();
  const { data: unreadTotal = 0 } = useUnreadChatCount();
  const { data: applicationsData } = useMyApplications();
  const { data: jobsData } = useJobs({ limit: 6 });

  const conversations: ConversationData[] = data?.conversations || [];
  const applications = applicationsData?.applications || [];
  const recommendedJobs = jobsData?.jobs || [];
  const currentUserId = user?._id || '';

  // Filter Accepted / Hired Applications
  const acceptedApplications = applications.filter(
    (app: any) => app.status === 'Accepted' || app.status === 'Hired'
  );

  // Filter Conversations by Search & Unread Filter
  const filteredConversations = conversations.filter((conv) => {
    const farmerName = conv.farmer?.name || '';
    const jobTitle = conv.job?.title || '';
    const lastMsg = conv.lastMessageText || '';

    const matchesSearch =
      !searchQuery.trim() ||
      farmerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lastMsg.toLowerCase().includes(searchQuery.toLowerCase());

    const isUnread = conv.unreadCount?.worker > 0;
    const matchesTab = activeTab === 'all' || isUnread;

    return matchesSearch && matchesTab;
  });

  // Calculate Online Farmers in Worker's Conversations
  const onlineFarmersList = conversations.filter((conv) => {
    const farmerId = conv.farmer?._id;
    return farmerId && (onlineUserIds.includes(farmerId) || presenceMap[farmerId]?.isOnline);
  });

  // Calculate Worker Profile Completion %
  const profileCompletionPercentage = (user as any)?.profileCompleted ? 90 : 65;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-3xl shadow-2xl backdrop-blur-md">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Worker Communication Dashboard
              </h1>
              <span className="text-xs font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Worker Hub
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Connect with farm owners, track accepted jobs, and respond to hiring inquiries.
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[260px] sm:min-w-[320px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search farmers, jobs, or messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all shadow-inner"
          />
        </div>
      </div>

      {/* KPI Overview Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Conversations */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-slate-900/90 border border-slate-800 p-5 rounded-3xl shadow-xl flex items-center justify-between"
        >
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Farmer Threads</p>
            <h3 className="text-2xl font-black text-white mt-1">{conversations.length}</h3>
            <p className="text-[11px] text-emerald-400 font-semibold mt-1 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1 inline" /> Active Applications
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
            <p className="text-[11px] text-slate-400 font-medium mt-1">Pending farmer replies</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
            <MessageSquare className="w-6 h-6" />
          </div>
        </motion.div>

        {/* Accepted / Hired Jobs */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-slate-900/90 border border-slate-800 p-5 rounded-3xl shadow-xl flex items-center justify-between"
        >
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Accepted Jobs</p>
            <h3 className="text-2xl font-black text-cyan-400 mt-1">{acceptedApplications.length}</h3>
            <p className="text-[11px] text-cyan-400 font-semibold mt-1 flex items-center">
              <CheckCircle2 className="w-3 h-3 mr-1 inline" /> Confirmed Hiring
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
            <Briefcase className="w-6 h-6" />
          </div>
        </motion.div>

        {/* Profile Completion */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-slate-900/90 border border-slate-800 p-5 rounded-3xl shadow-xl flex items-center justify-between"
        >
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Profile Score</p>
            <h3 className="text-2xl font-black text-amber-400 mt-1">{profileCompletionPercentage}%</h3>
            <p className="text-[11px] text-amber-400 font-medium mt-1">Boosts hiring visibility</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-950/80 border border-amber-800/60 flex items-center justify-center text-amber-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </motion.div>
      </div>

      {/* Main Split Grid Layout: Farmer Conversations & Chat Window */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[680px]">
        {/* Left Column: Recent Farmer Conversations List (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header Tabs */}
          <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center">
              <MessageSquare className="w-4 h-4 mr-2 text-emerald-400" /> Farmer Chats
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
                <p>Loading farmer messages...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-slate-500 flex flex-col items-center">
                <Sparkles className="w-8 h-8 text-slate-600 mb-2" />
                <p className="text-xs font-semibold text-slate-300">No conversations found</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Apply to farm jobs to start chatting with farmers
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = selectedConversation?._id === conv._id;
                const farmerId = conv.farmer?._id;
                const isFarmerOnline = farmerId ? (onlineUserIds.includes(farmerId) || presenceMap[farmerId]?.isOnline) : false;

                return (
                  <ConversationCard
                    key={conv._id}
                    conversation={conv}
                    isSelected={isSelected}
                    isOnline={isFarmerOnline}
                    unreadCount={conv.unreadCount?.worker || 0}
                    currentUserId={currentUserId}
                    userRole="worker"
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
              <h3 className="text-lg font-bold text-white">Select a farmer conversation</h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Click on any farmer thread on the left pane to view work details, discuss daily wages, or send document attachments.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Accepted Jobs & Profile Completion Widget Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Accepted Jobs List (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 p-5 rounded-3xl shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center">
              <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-400" /> Accepted & Hired Farm Jobs
            </h3>
            <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-800">
              {acceptedApplications.length} Confirmed
            </span>
          </div>

          <div className="space-y-3">
            {acceptedApplications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-950/60 rounded-2xl border border-slate-800">
                No accepted applications yet. Keep applying to open farm vacancies!
              </div>
            ) : (
              acceptedApplications.map((app: any) => (
                <div
                  key={app._id}
                  className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-emerald-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors shadow-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-xs font-bold text-white">{app.job?.title || 'Farm Job'}</h4>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {app.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 flex items-center space-x-3">
                      <span className="flex items-center text-emerald-400 font-semibold">
                        <IndianRupee className="w-3 h-3 mr-0.5" />
                        {app.job?.dailyWage || 600}/day
                      </span>
                      {app.job?.location?.city && (
                        <span className="flex items-center">
                          <MapPin className="w-3 h-3 mr-0.5 inline text-slate-500" />
                          {app.job.location.city}
                        </span>
                      )}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      const matchConv = conversations.find(
                        (c) => c.job?._id === (app.job?._id || app.job)
                      );
                      if (matchConv) {
                        setSelectedConversation(matchConv);
                      } else {
                        navigate('/chat');
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center space-x-1 shrink-0 shadow-md"
                  >
                    <span>Chat with Farmer</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Profile Completion & Online Farmers Widget (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Profile Completion Widget */}
          <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-3xl shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center">
                <ShieldCheck className="w-4 h-4 mr-2 text-amber-400" /> Profile Strength
              </h3>
              <span className="text-xs font-black text-amber-400">{profileCompletionPercentage}%</span>
            </div>

            <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${profileCompletionPercentage}%` }}
                className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full rounded-full"
              />
            </div>

            <div className="space-y-1.5 pt-1">
              <p className="text-[11px] text-emerald-400 font-semibold flex items-center">
                <CheckCircle className="w-3.5 h-3.5 mr-1.5 inline" /> Mobile number verified
              </p>
              <p className="text-[11px] text-emerald-400 font-semibold flex items-center">
                <CheckCircle className="w-3.5 h-3.5 mr-1.5 inline" /> Agricultural categories set
              </p>
              {!(user as any)?.profileCompleted && (
                <p className="text-[11px] text-amber-400 font-medium flex items-center">
                  <Zap className="w-3.5 h-3.5 mr-1.5 inline" /> Upload certificates to reach 100%
                </p>
              )}
            </div>
          </div>

          {/* Online Farmers List */}
          <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-3xl shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center">
                <Users className="w-4 h-4 mr-2 text-cyan-400" /> Online Farmer Employers
              </h3>
              <span className="text-[11px] font-bold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded-full border border-cyan-800">
                {onlineFarmersList.length} Online
              </span>
            </div>

            <div className="max-h-36 overflow-y-auto space-y-2 pr-1">
              {onlineFarmersList.length === 0 ? (
                <div className="text-center text-xs text-slate-500 py-4">
                  No farmers are currently online
                </div>
              ) : (
                onlineFarmersList.map((conv) => {
                  const farmer = conv.farmer;
                  return (
                    <div
                      key={conv._id}
                      onClick={() => setSelectedConversation(conv)}
                      className="p-2.5 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-emerald-500/50 flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600/30 to-teal-800/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs">
                          {farmer?.name ? farmer.name.charAt(0).toUpperCase() : 'F'}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">{farmer?.name}</h4>
                          <p className="text-[10px] text-emerald-400 truncate max-w-[150px]">
                            {conv.job?.title}
                          </p>
                        </div>
                      </div>

                      <OnlineIndicator userId={farmer._id} showText={false} size="sm" />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recommended Jobs Section */}
      <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Recommended Farm Jobs for You</h3>
          </div>
          <button
            onClick={() => navigate('/jobs')}
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
          >
            <span>View All Jobs</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {recommendedJobs.slice(0, 3).map((job: any) => (
            <div
              key={job._id}
              onClick={() => navigate(`/jobs/${job._id}`)}
              className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-emerald-500/50 transition-all cursor-pointer space-y-2 group shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-400 uppercase px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800">
                  {job.category || 'Agriculture'}
                </span>
                <span className="text-xs font-black text-white flex items-center">
                  <IndianRupee className="w-3 h-3 text-emerald-400 mr-0.5" />
                  {job.dailyWage || 600}/day
                </span>
              </div>

              <h4 className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                {job.title}
              </h4>

              <p className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                <span>{job.farmerName || 'Farm Owner'}</span>
                {job.location?.city && (
                  <span className="flex items-center">
                    <MapPin className="w-3 h-3 mr-1 text-slate-500 inline" />
                    {job.location.city}
                  </span>
                )}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
