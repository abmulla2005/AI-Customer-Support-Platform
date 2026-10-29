import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { AdminStats } from '../../types';
import { Navbar } from '../../components/Navbar';
import { Sidebar } from '../../components/Sidebar';
import {
  LayoutDashboard,
  Users,
  LifeBuoy,
  MessageSquare,
  FileText,
  Zap,
  TrendingUp,
  Shield,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

export const AdminDashboardPage: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const data = await api.getAdminAnalytics();
        setStats(data);
      } catch (err) {
        console.error('Failed to load admin analytics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 overflow-hidden">
      <Navbar toggleSidebar={() => setSidebarOpen(prev => !prev)} />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-6xl w-full mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <LayoutDashboard className="w-6 h-6 text-rose-600" /> Platform Operational Analytics
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              System health, active user engagement, AI token consumption, and support resolution metrics.
            </p>
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400 font-semibold uppercase">Total Users</span>
                <Users className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-extrabold text-gray-900 dark:text-white">
                {loading ? '...' : stats?.total_users || 0}
              </div>
              <div className="text-[11px] text-gray-500 mt-1">
                {stats?.total_customers || 0} customers • {stats?.total_employees || 0} staff
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400 font-semibold uppercase">Support Tickets</span>
                <LifeBuoy className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-extrabold text-gray-900 dark:text-white">
                {loading ? '...' : stats?.total_tickets || 0}
              </div>
              <div className="text-[11px] text-amber-600 font-medium mt-1">
                {stats?.open_tickets || 0} currently open
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400 font-semibold uppercase">Conversations</span>
                <MessageSquare className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="text-2xl font-extrabold text-gray-900 dark:text-white">
                {loading ? '...' : stats?.total_chats || 0}
              </div>
              <div className="text-[11px] text-gray-500 mt-1">Multi-turn AI sessions</div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400 font-semibold uppercase">AI Tokens Used</span>
                <Zap className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-2xl font-extrabold text-gray-900 dark:text-white font-mono">
                {loading ? '...' : (stats?.ai_tokens_used || 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-purple-600 font-medium mt-1">LLM inference metric</div>
            </div>
          </div>

          {/* Interactive Recharts Chart */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" /> Weekly Platform Activity Trend
                </h3>
                <p className="text-xs text-gray-500">
                  Daily comparison of AI conversations initiated vs. escalated support tickets
                </p>
              </div>
            </div>

            <div className="h-72 w-full">
              {stats?.activity_timeline && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.activity_timeline} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorChats" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorTickets" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="day" stroke="#888888" fontSize={12} tickLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        borderColor: '#334155',
                        borderRadius: '0.75rem',
                        fontSize: '0.75rem',
                        color: '#f8fafc',
                      }}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="chats" name="AI Conversations" stroke="#3b82f6" fillOpacity={1} fill="url(#colorChats)" />
                    <Area type="monotone" dataKey="tickets" name="Support Tickets" stroke="#f59e0b" fillOpacity={1} fill="url(#colorTickets)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
