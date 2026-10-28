import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Navbar } from '../../components/Navbar';
import { Sidebar } from '../../components/Sidebar';
import { LayoutDashboard, LifeBuoy, Users, CheckCircle2, Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const EmployeeDashboardPage: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [assignments, setAssignments] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dash, assign] = await Promise.all([
          api.getEmployeeDashboard(),
          api.getEmployeeAssignments(),
        ]);
        setStats(dash);
        setAssignments(assign);
      } catch (err) {
        console.error('Error loading employee workspace', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
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
              <LayoutDashboard className="w-6 h-6 text-amber-600" /> Employee Support Workspace
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Active ticket queue, assigned customer accounts, and internal triage tools.
            </p>
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
                <LifeBuoy className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-gray-400 font-medium">My Active Tickets</div>
                <div className="text-2xl font-extrabold text-gray-900 dark:text-white">
                  {loading ? '...' : stats?.assigned_active_tickets || 0}
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-gray-400 font-medium">Unassigned Queue</div>
                <div className="text-2xl font-extrabold text-gray-900 dark:text-white">
                  {loading ? '...' : stats?.unassigned_queue_tickets || 0}
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-gray-400 font-medium">Tickets Resolved</div>
                <div className="text-2xl font-extrabold text-gray-900 dark:text-white">
                  {loading ? '...' : stats?.resolved_tickets || 0}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions & Recent Assigned Tickets */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <LifeBuoy className="w-4 h-4 text-amber-600" /> Assigned Tickets ({assignments?.assigned_tickets?.length || 0})
                </h3>
                <Link to="/employee/tickets" className="text-xs text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 hover:underline">
                  View All <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {loading ? (
                <div className="text-xs text-gray-400 py-6 text-center">Loading assigned tickets...</div>
              ) : !assignments?.assigned_tickets || assignments.assigned_tickets.length === 0 ? (
                <div className="text-xs text-gray-400 py-8 text-center border border-dashed border-gray-200 dark:border-slate-800 rounded-xl">
                  No tickets currently assigned to you. Check the unassigned queue.
                </div>
              ) : (
                <div className="space-y-2">
                  {assignments.assigned_tickets.slice(0, 5).map((t: any) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/40 flex items-center justify-between"
                    >
                      <div className="overflow-hidden">
                        <div className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                          #{t.id} - {t.title}
                        </div>
                        <div className="text-[11px] text-gray-400">
                          Customer: {t.customer_name || t.customer_email || 'Customer'}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                        {t.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" /> Assigned Customer Accounts
              </h3>

              {loading ? (
                <div className="text-xs text-gray-400 py-6 text-center">Loading customers...</div>
              ) : !assignments?.assigned_customers || assignments.assigned_customers.length === 0 ? (
                <div className="text-xs text-gray-400 py-8 text-center border border-dashed border-gray-200 dark:border-slate-800 rounded-xl">
                  No customers assigned directly yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {assignments.assigned_customers.map((c: any) => (
                    <div
                      key={c.id}
                      className="p-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/40 flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                          {c.full_name}
                        </div>
                        <div className="text-[11px] text-gray-400">{c.email}</div>
                      </div>
                      <span className="text-[10px] text-gray-400">
                        Joined {new Date(c.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
