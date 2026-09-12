import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { getAnalyticsUserGrowthApi, getAnalyticsJobTrendsApi } from '../../services/adminService';
import { BarChart3, TrendingUp, MapPin } from 'lucide-react';

export const AdminAnalyticsPage: React.FC = () => {
  const { data: userTrends, isLoading: isUserLoading } = useQuery({
    queryKey: ['analyticsUserGrowth'],
    queryFn: () => getAnalyticsUserGrowthApi(30),
  });

  const { data: jobTrends, isLoading: isJobLoading } = useQuery({
    queryKey: ['analyticsJobTrends'],
    queryFn: () => getAnalyticsJobTrendsApi(30),
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <BarChart3 size={20} className="text-emerald-400" />
          <h3 className="text-sm font-heading font-semibold text-white">Platform Growth & Demand Analytics</h3>
        </div>

        {/* Analytics Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Growth */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-heading font-semibold text-white text-sm flex items-center space-x-2">
                <TrendingUp size={16} className="text-emerald-400" />
                <span>User Growth by Role (Last 30 Days)</span>
              </h4>
            </div>

            <div className="space-y-2">
              {isUserLoading ? (
                <div className="text-slate-500 text-xs py-8 text-center">Loading growth analytics...</div>
              ) : userTrends?.length === 0 ? (
                <div className="text-slate-500 text-xs py-8 text-center">No trend data available.</div>
              ) : (
                userTrends?.slice(0, 10).map((t, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800/80 font-mono text-xs">
                    <span className="text-slate-400">{t._id.date}</span>
                    <span className="text-emerald-400 font-bold">{t._id.role}</span>
                    <span className="text-white bg-slate-900 px-2.5 py-0.5 rounded border border-slate-800">{t.count} user(s)</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Job Demand Trends */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-heading font-semibold text-white text-sm flex items-center space-x-2">
                <MapPin size={16} className="text-blue-400" />
                <span>Job Posting Trends by Category</span>
              </h4>
            </div>

            <div className="space-y-2">
              {isJobLoading ? (
                <div className="text-slate-500 text-xs py-8 text-center">Loading job trends...</div>
              ) : jobTrends?.length === 0 ? (
                <div className="text-slate-500 text-xs py-8 text-center">No job trend data available.</div>
              ) : (
                jobTrends?.slice(0, 10).map((t, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800/80 font-mono text-xs">
                    <span className="text-slate-400">{t._id.date}</span>
                    <span className="text-blue-400 font-bold">{t._id.category}</span>
                    <span className="text-white bg-slate-900 px-2.5 py-0.5 rounded border border-slate-800">{t.count} job(s)</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
