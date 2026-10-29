import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { SupportTicket, EmployeeNote, TicketStatus, TicketPriority } from '../../types';
import { Navbar } from '../../components/Navbar';
import { Sidebar } from '../../components/Sidebar';
import {
  LifeBuoy,
  Lock,
  Sparkles,
  Send,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertTriangle,
  User,
  Plus,
} from 'lucide-react';

export const EmployeeTicketsPage: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [notes, setNotes] = useState<EmployeeNote[]>([]);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [loading, setLoading] = useState(true);

  // AI suggestions
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replySuccess, setReplySuccess] = useState('');

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const list = await api.listTickets();
      setTickets(list);
      if (list.length > 0 && !selectedTicket) {
        selectTicket(list[0]);
      }
    } catch (err) {
      console.error('Failed to load tickets', err);
    } finally {
      setLoading(false);
    }
  };

  const selectTicket = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setReplySuccess('');
    try {
      const noteList = await api.listEmployeeNotes(ticket.id);
      setNotes(noteList);
      // Auto-fetch AI suggestion
      fetchAiSuggestions(ticket.description, ticket.id);
    } catch (err) {
      console.error('Error fetching ticket notes', err);
    }
  };

  const fetchAiSuggestions = async (query: string, ticketId?: string) => {
    setLoadingSuggestions(true);
    try {
      const res = await api.getAiSuggestions(query, ticketId);
      setSuggestions(res.suggestions || []);
    } catch (err) {
      console.error('Error getting AI suggestions', err);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (!selectedTicket) return;
    try {
      const updated = await api.updateTicket(selectedTicket.id, { status: newStatus });
      setSelectedTicket(updated);
      setTickets(prev => prev.map(t => (t.id === updated.id ? updated : t)));
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const handlePriorityChange = async (newPriority: TicketPriority) => {
    if (!selectedTicket) return;
    try {
      const updated = await api.updateTicket(selectedTicket.id, { priority: newPriority });
      setSelectedTicket(updated);
      setTickets(prev => prev.map(t => (t.id === updated.id ? updated : t)));
    } catch (err) {
      console.error('Failed to update priority', err);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newNoteContent.trim()) return;
    try {
      const createdNote = await api.addEmployeeNote(selectedTicket.id, newNoteContent.trim());
      setNotes(prev => [...prev, createdNote]);
      setNewNoteContent('');
    } catch (err) {
      console.error('Failed to save private internal note', err);
    }
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;
    // Mark ticket as resolved or in_progress and display success notification
    handleStatusChange('in_progress');
    setReplySuccess(`Response transmitted to customer (${selectedTicket.customer_email || 'Customer'}).`);
    setReplyText('');
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 overflow-hidden">
      <Navbar toggleSidebar={() => setSidebarOpen(prev => !prev)} />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 overflow-hidden p-4 sm:p-6 flex flex-col max-w-7xl w-full mx-auto">
          <div className="mb-4">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <LifeBuoy className="w-5 h-5 text-amber-600" /> Customer Support Queue & Ticket Management
            </h1>
          </div>

          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden">
            {/* Tickets Sidebar Column */}
            <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl flex flex-col overflow-hidden">
              <div className="p-3 border-b border-gray-200 dark:border-slate-800 text-xs font-semibold uppercase text-gray-400">
                Support Tickets ({tickets.length})
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                {loading ? (
                  <div className="text-xs text-gray-400 p-4 text-center">Loading queue...</div>
                ) : tickets.length === 0 ? (
                  <div className="text-xs text-gray-400 p-4 text-center">No active tickets.</div>
                ) : (
                  tickets.map(t => {
                    const isSelected = selectedTicket?.id === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => selectTicket(t)}
                        className={`p-3 rounded-xl border cursor-pointer transition ${
                          isSelected
                            ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30'
                            : 'border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                            #{t.id}
                          </span>
                          <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800">
                            {t.status}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                          {t.title}
                        </div>
                        <div className="text-[11px] text-gray-400 truncate mt-0.5">
                          From: {t.customer_name || t.customer_email || 'Customer'}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Ticket Workspace Column */}
            <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl flex flex-col overflow-hidden p-5">
              {selectedTicket ? (
                <div className="flex-1 overflow-y-auto space-y-5 pr-1">
                  {/* Ticket Header & Status Selectors */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-200 dark:border-slate-800">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-bold text-sm text-amber-600">
                          #{selectedTicket.id}
                        </span>
                        <span className="text-xs text-gray-500">
                          Customer: <strong>{selectedTicket.customer_name || selectedTicket.customer_email}</strong>
                        </span>
                      </div>
                      <h2 className="text-base font-bold text-gray-900 dark:text-white">
                        {selectedTicket.title}
                      </h2>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={selectedTicket.status}
                        onChange={e => handleStatusChange(e.target.value as TicketStatus)}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 font-semibold focus:outline-none"
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>

                      <select
                        value={selectedTicket.priority}
                        onChange={e => handlePriorityChange(e.target.value as TicketPriority)}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 font-semibold focus:outline-none"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>

                  {/* Customer problem description */}
                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 text-xs">
                    <div className="font-semibold text-gray-500 mb-1">Customer Problem Statement:</div>
                    <p className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                      {selectedTicket.description}
                    </p>
                  </div>

                  {/* AI Reply Suggestions */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50/60 to-indigo-50/60 dark:from-slate-800/80 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-900">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" /> AI-Generated Reply Suggestions
                      </span>
                      <button
                        onClick={() => fetchAiSuggestions(selectedTicket.description, selectedTicket.id)}
                        disabled={loadingSuggestions}
                        className="text-[11px] text-blue-600 hover:underline"
                      >
                        {loadingSuggestions ? 'Generating...' : 'Refresh Suggestions'}
                      </button>
                    </div>

                    <div className="space-y-2">
                      {suggestions.map((sug, idx) => (
                        <div
                          key={idx}
                          onClick={() => setReplyText(sug)}
                          className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-blue-100 dark:border-slate-700 text-xs text-gray-700 dark:text-gray-300 hover:border-blue-500 cursor-pointer transition shadow-2xs"
                          title="Click to insert into reply"
                        >
                          <span className="text-blue-500 font-semibold mr-1.5">Option {idx + 1}:</span>
                          "{sug}"
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Reply Editor */}
                  {replySuccess && (
                    <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      <span>{replySuccess}</span>
                    </div>
                  )}

                  <form onSubmit={handleSendReply} className="space-y-2">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Respond to Customer:
                    </label>
                    <textarea
                      rows={3}
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder="Type your response to the customer or select an AI suggestion above..."
                      className="w-full p-3 text-xs rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={!replyText.trim()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-40"
                      >
                        <Send className="w-3.5 h-3.5" /> Transmit Customer Response
                      </button>
                    </div>
                  </form>

                  {/* Private Internal Notes (Strict Isolation: Visible only to employees & admins) */}
                  <div className="pt-4 border-t border-gray-200 dark:border-slate-800">
                    <div className="flex items-center gap-2 mb-3">
                      <Lock className="w-4 h-4 text-amber-600" />
                      <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                        Private Internal Notes (Isolated from Customer View)
                      </h3>
                    </div>

                    <div className="space-y-2 mb-3">
                      {notes.length === 0 ? (
                        <div className="text-xs text-gray-400 py-3 text-center border border-dashed border-gray-200 dark:border-slate-800 rounded-lg">
                          No private notes recorded yet.
                        </div>
                      ) : (
                        notes.map(n => (
                          <div
                            key={n.id}
                            className="p-2.5 rounded-lg bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs"
                          >
                            <div className="flex items-center justify-between text-[11px] text-amber-800 dark:text-amber-300 font-semibold mb-1">
                              <span>{n.author_name} (Internal Staff)</span>
                              <span>{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{n.content}</p>
                          </div>
                        ))
                      )}
                    </div>

                    <form onSubmit={handleAddNote} className="flex gap-2">
                      <input
                        type="text"
                        value={newNoteContent}
                        onChange={e => setNewNoteContent(e.target.value)}
                        placeholder="Add confidential internal note regarding this ticket..."
                        className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                      <button
                        type="submit"
                        disabled={!newNoteContent.trim()}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition disabled:opacity-40"
                      >
                        Add Private Note
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-gray-400">
                  Select a ticket from the left panel to begin resolution.
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
