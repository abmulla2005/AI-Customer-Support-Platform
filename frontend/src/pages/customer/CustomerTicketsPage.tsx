import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { SupportTicket, TicketPriority } from '../../types';
import { Navbar } from '../../components/Navbar';
import { Sidebar } from '../../components/Sidebar';
import {
  LifeBuoy,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
  Search,
  Filter,
} from 'lucide-react';

export const CustomerTicketsPage: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const list = await api.listTickets();
      setTickets(list);
    } catch (err) {
      console.error('Failed to load tickets', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setSubmitting(true);
    setError('');
    try {
      const created = await api.createTicket({ title, description, priority });
      setTickets(prev => [created, ...prev]);
      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      setPriority('medium');
    } catch (err: any) {
      setError(err.message || 'Failed to create ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">Open</span>;
      case 'in_progress':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">In Progress</span>;
      case 'resolved':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Resolved</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">Closed</span>;
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'urgent':
        return <span className="text-rose-600 font-semibold text-[11px] flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Urgent</span>;
      case 'high':
        return <span className="text-amber-600 font-semibold text-[11px]">High</span>;
      case 'low':
        return <span className="text-gray-500 text-[11px]">Low</span>;
      default:
        return <span className="text-blue-600 text-[11px]">Medium</span>;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 overflow-hidden">
      <Navbar toggleSidebar={() => setSidebarOpen(prev => !prev)} />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-5xl w-full mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <LifeBuoy className="w-6 h-6 text-blue-600" /> Customer Support Tickets
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                View status of escalated queries, agent responses, and create support requests.
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2 transition shadow-sm"
            >
              <Plus className="w-4 h-4" /> Raise Support Ticket
            </button>
          </div>

          {/* Ticket list */}
          {loading ? (
            <div className="text-center py-12 text-xs text-gray-400">Loading support tickets...</div>
          ) : tickets.length === 0 ? (
            <div className="p-10 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-center">
              <LifeBuoy className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">No support tickets found</h3>
              <p className="text-xs text-gray-400 mt-1 mb-4">
                Have an unresolved issue? You can escalate any query directly to our support engineers.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition"
              >
                Create First Ticket
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map(ticket => (
                <div
                  key={ticket.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs hover:border-blue-400 dark:hover:border-blue-600 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                        #{ticket.id}
                      </span>
                      {getStatusBadge(ticket.status)}
                      {getPriorityBadge(ticket.priority)}
                    </div>
                    <div className="text-[11px] text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                    {ticket.title}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    {ticket.description}
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-gray-500">
                    <span>
                      Assigned Agent:{' '}
                      <strong className="text-gray-700 dark:text-gray-300">
                        {ticket.assigned_employee_name || 'Pending assignment'}
                      </strong>
                    </span>
                    <span className="capitalize">Status: {ticket.status.replace('_', ' ')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Create Modal */}
          {showCreateModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-40">
              <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl relative">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X className="w-5 h-5" />
                </button>

                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                  Raise a Support Ticket
                </h2>
                <p className="text-xs text-gray-500 mb-4">
                  Our customer service engineers will review and respond to your request.
                </p>

                {error && (
                  <div className="mb-4 p-3 rounded-lg bg-rose-50 text-rose-700 text-xs">
                    {error}
                  </div>
                )}

                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Issue Summary (Title)
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="e.g., Billing discrepancy on monthly invoice"
                      className="w-full px-3 py-2 text-sm rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Priority Level
                    </label>
                    <select
                      value={priority}
                      onChange={e => setPriority(e.target.value as TicketPriority)}
                      className="w-full px-3 py-2 text-sm rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Low - General query</option>
                      <option value="medium">Medium - Standard support</option>
                      <option value="high">High - Functional disruption</option>
                      <option value="urgent">Urgent - Service critical</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Detailed Description
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Please explain the details of the problem..."
                      className="w-full px-3 py-2 text-sm rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800 rounded-xl transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition disabled:opacity-50"
                    >
                      {submitting ? 'Submitting...' : 'Submit Ticket'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
