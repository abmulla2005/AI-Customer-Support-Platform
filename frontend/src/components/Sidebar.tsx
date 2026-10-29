import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ChatThread } from '../types';
import {
  MessageSquare,
  Plus,
  FileText,
  LifeBuoy,
  Users,
  Settings,
  Shield,
  BookOpen,
  Search,
  Trash2,
  Edit2,
  Check,
  X,
  LayoutDashboard,
  FileSpreadsheet
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
  activeChatId?: string;
  onSelectChat?: (chatId: string) => void;
  onNewChat?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  activeChatId,
  onSelectChat,
  onNewChat,
}) => {
  const { role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [chats, setChats] = useState<ChatThread[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const loadChats = async () => {
    if (role === 'customer') {
      try {
        const list = await api.listChats();
        setChats(list);
      } catch (err) {
        console.error('Failed to load chats', err);
      }
    }
  };

  useEffect(() => {
    loadChats();
  }, [role, activeChatId]);

  const handleRename = async (chatId: string) => {
    if (!editTitle.trim()) {
      setEditingId(null);
      return;
    }
    try {
      await api.renameChat(chatId, editTitle.trim());
      setChats(prev => prev.map(c => (c.id === chatId ? { ...c, title: editTitle.trim() } : c)));
      setEditingId(null);
    } catch (err) {
      console.error('Rename failed', err);
    }
  };

  const handleDelete = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this conversation?')) return;
    try {
      await api.deleteChat(chatId);
      setChats(prev => prev.filter(c => c.id !== chatId));
      if (activeChatId === chatId && onNewChat) {
        onNewChat();
      }
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  const filteredChats = chats.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-20 w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Customer View */}
        {role === 'customer' && (
          <div className="flex flex-col h-full">
            <div className="p-3 border-b border-gray-200 dark:border-slate-800">
              <button
                onClick={() => {
                  if (onNewChat) onNewChat();
                  navigate('/chat');
                  if (onClose) onClose();
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
              >
                <Plus className="w-4 h-4" /> New Chat
              </button>

              <div className="relative mt-2">
                <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search chats..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1">
                Recent Chats
              </div>
              {filteredChats.length === 0 ? (
                <div className="text-xs text-gray-400 px-3 py-4 text-center">
                  No conversations yet. Start a new chat!
                </div>
              ) : (
                filteredChats.map(c => {
                  const isActive = c.id === activeChatId;
                  const isEditing = c.id === editingId;

                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        if (onSelectChat) onSelectChat(c.id);
                        navigate(`/chat?id=${c.id}`);
                        if (onClose) onClose();
                      }}
                      className={`group relative flex items-center justify-between px-2.5 py-2 text-xs rounded-lg cursor-pointer transition ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 font-medium'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden flex-1">
                        <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                        {isEditing ? (
                          <input
                            type="text"
                            value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            onClick={e => e.stopPropagation()}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleRename(c.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            autoFocus
                            className="w-full bg-white dark:bg-slate-800 border border-blue-500 rounded px-1 text-xs py-0.5 outline-none"
                          />
                        ) : (
                          <span className="truncate">{c.title || 'Conversation'}</span>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isEditing ? (
                          <>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                handleRename(c.id);
                              }}
                              className="p-1 hover:text-green-600"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setEditingId(null);
                              }}
                              className="p-1 hover:text-gray-500"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setEditingId(c.id);
                                setEditTitle(c.title);
                              }}
                              className="p-1 hover:text-blue-600"
                              title="Rename"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={e => handleDelete(c.id, e)}
                              className="p-1 hover:text-rose-600"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Navigation links */}
            <div className="p-3 border-t border-gray-200 dark:border-slate-800 space-y-1">
              <Link
                to="/documents"
                onClick={onClose}
                className={`flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg font-medium transition ${
                  location.pathname === '/documents'
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                }`}
              >
                <FileText className="w-4 h-4" /> My Documents & RAG
              </Link>
              <Link
                to="/tickets"
                onClick={onClose}
                className={`flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg font-medium transition ${
                  location.pathname === '/tickets'
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                }`}
              >
                <LifeBuoy className="w-4 h-4" /> Support Tickets
              </Link>
            </div>
          </div>
        )}

        {/* Employee View */}
        {role === 'employee' && (
          <div className="flex flex-col h-full p-3 space-y-1">
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">
              Employee Workspace
            </div>
            <Link
              to="/employee/dashboard"
              onClick={onClose}
              className={`flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg font-medium transition ${
                location.pathname === '/employee/dashboard'
                  ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" /> Queue & Analytics
            </Link>
            <Link
              to="/employee/tickets"
              onClick={onClose}
              className={`flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg font-medium transition ${
                location.pathname === '/employee/tickets'
                  ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
              }`}
            >
              <LifeBuoy className="w-4 h-4" /> Customer Tickets & Notes
            </Link>
            <Link
              to="/employee/knowledge"
              onClick={onClose}
              className={`flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg font-medium transition ${
                location.pathname === '/employee/knowledge'
                  ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
              }`}
            >
              <BookOpen className="w-4 h-4" /> Knowledge Base & SOPs
            </Link>
          </div>
        )}

        {/* Admin View */}
        {role === 'admin' && (
          <div className="flex flex-col h-full p-3 space-y-1">
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">
              Admin Operations
            </div>
            <Link
              to="/admin/dashboard"
              onClick={onClose}
              className={`flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg font-medium transition ${
                location.pathname === '/admin/dashboard'
                  ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" /> Metrics & Analytics
            </Link>
            <Link
              to="/admin/users"
              onClick={onClose}
              className={`flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg font-medium transition ${
                location.pathname === '/admin/users'
                  ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
              }`}
            >
              <Users className="w-4 h-4" /> User & Role Management
            </Link>
            <Link
              to="/admin/knowledge"
              onClick={onClose}
              className={`flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg font-medium transition ${
                location.pathname === '/admin/knowledge'
                  ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
              }`}
            >
              <BookOpen className="w-4 h-4" /> Knowledge Base
            </Link>
            <Link
              to="/admin/audit-logs"
              onClick={onClose}
              className={`flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg font-medium transition ${
                location.pathname === '/admin/audit-logs'
                  ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
              }`}
            >
              <Shield className="w-4 h-4" /> Security Audit Logs
            </Link>
            <Link
              to="/admin/settings"
              onClick={onClose}
              className={`flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg font-medium transition ${
                location.pathname === '/admin/settings'
                  ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
              }`}
            >
              <Settings className="w-4 h-4" /> AI Models & MCP Config
            </Link>
          </div>
        )}
      </aside>
    </>
  );
};
