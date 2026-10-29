import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Navbar } from '../../components/Navbar';
import { Sidebar } from '../../components/Sidebar';
import { User, Mail, Shield, Trash2, CheckCircle2, AlertCircle, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const CustomerProfilePage: React.FC = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const updated = await api.updateMe({ full_name: fullName });
      updateUser(updated);
      setMessage('Profile information saved successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await api.deleteMe();
      await logout();
      navigate('/login');
    } catch (err: any) {
      setError(err.message || 'Failed to delete account.');
      setDeleting(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 overflow-hidden">
      <Navbar toggleSidebar={() => setSidebarOpen(prev => !prev)} />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-3xl w-full mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <User className="w-6 h-6 text-blue-600" /> Account Settings & Privacy
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Manage personal details, security parameters, and data deletion rights.
            </p>
          </div>

          {message && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm space-y-6">
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-gray-100 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-800 text-gray-500 cursor-not-allowed"
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Email is locked to maintain session integrity.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Assigned Platform Role
                </label>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-900">
                  <Shield className="w-4 h-4" /> {user?.role}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Update Details'}
                </button>
              </div>
            </form>

            {/* Danger Zone: Account Deletion */}
            <div className="pt-6 border-t border-rose-100 dark:border-rose-950/60">
              <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 mb-1">
                Danger Zone: Personal Data Erasure
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                Permanently purge your account, conversations, uploaded PDFs, vector embeddings, and support tickets from MongoDB. This action is irreversible.
              </p>

              {showDeleteConfirm ? (
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900">
                  <p className="text-xs text-rose-800 dark:text-rose-200 font-semibold mb-3">
                    Are you absolutely certain? All chats, documents, and credentials will be permanently erased immediately.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={handleDeleteAccount}
                      className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50"
                    >
                      {deleting ? 'Erasing Data...' : 'Yes, Delete My Account'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-4 py-1.5 bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-lg transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Trash2 className="w-4 h-4" /> Delete Account & Erase Personal Records
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
