import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { AuditLog } from '../../types';
import { Navbar } from '../../components/Navbar';
import { Sidebar } from '../../components/Sidebar';
import { Shield, Clock, Terminal, User, Search, RefreshCw } from 'lucide-react';

export const AdminAuditLogsPage: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const list = await api.getAuditLogs();
      setLogs(list);
    } catch (err) {
      console.error('Failed to load audit trail', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filtered = logs.filter(l =>
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.resource.toLowerCase().includes(search.toLowerCase()) ||
    (l.user_email && l.user_email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 overflow-hidden">
      <Navbar toggleSidebar={() => setSidebarOpen(prev => !prev)} />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-6xl w-full mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Shield className="w-6 h-6 text-rose-600" /> Security Audit Trail & Access Logs
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                Tamper-evident system activity logs recording logins, tool executions, document uploads, and role assignments.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search actions, resources, users..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <button
                onClick={fetchLogs}
                className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 transition"
                title="Refresh audit trail"
              >
                <RefreshCw className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-slate-800/60 text-gray-500 uppercase font-semibold text-[11px] border-b border-gray-200 dark:border-slate-800">
                  <tr>
                    <th className="px-5 py-3.5">Timestamp (UTC)</th>
                    <th className="px-5 py-3.5">User Identity</th>
                    <th className="px-5 py-3.5">Action Executed</th>
                    <th className="px-5 py-3.5">Resource Scoped</th>
                    <th className="px-5 py-3.5">Security Parameters</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-400">Loading audit records...</td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-400">No matching audit events.</td>
                    </tr>
                  ) : (
                    filtered.map(l => (
                      <tr key={l.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition">
                        <td className="px-5 py-3.5 text-gray-500 font-mono text-[11px] whitespace-nowrap">
                          {new Date(l.timestamp).toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-gray-800 dark:text-gray-200">
                            {l.user_email || 'System Operation'}
                          </div>
                          {l.ip_address && (
                            <div className="text-[10px] text-gray-400 font-mono">IP: {l.ip_address}</div>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-mono px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-gray-200 font-semibold text-[11px]">
                            {l.action}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-gray-600 dark:text-gray-400 capitalize">
                          {l.resource}
                        </td>
                        <td className="px-5 py-3.5">
                          <code className="text-[10px] font-mono text-gray-500 bg-gray-50 dark:bg-slate-800/80 p-1 rounded max-w-xs block truncate" title={JSON.stringify(l.details)}>
                            {JSON.stringify(l.details)}
                          </code>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
