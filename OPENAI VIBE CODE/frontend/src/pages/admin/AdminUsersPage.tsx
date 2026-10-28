import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { User, Role } from '../../types';
import { Navbar } from '../../components/Navbar';
import { Sidebar } from '../../components/Sidebar';
import { Users, Shield, Trash2, CheckCircle2, XCircle, Search, Filter } from 'lucide-react';

export const AdminUsersPage: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const list = await api.listUsers(roleFilter || undefined);
      setUsers(list);
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const handleRoleChange = async (userId: string, newRole: Role) => {
    try {
      const updated = await api.updateUser(userId, { role: newRole });
      setUsers(prev => prev.map(u => (u.id === userId ? updated : u)));
    } catch (err) {
      console.error('Failed to update role', err);
    }
  };

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    try {
      const updated = await api.updateUser(userId, { is_active: !currentActive });
      setUsers(prev => prev.map(u => (u.id === userId ? updated : u)));
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const handleDeleteUser = async (userId: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete user "${name}"?`)) return;
    try {
      await api.deleteUser(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err: any) {
      alert(err.message || 'Cannot delete user.');
    }
  };

  const filtered = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
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
                <Users className="w-6 h-6 text-rose-600" /> User & Role Management
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                Configure user roles, account active statuses, and access permissions.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Filter users..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="text-xs px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-semibold focus:outline-none"
              >
                <option value="">All Roles</option>
                <option value="customer">Customers</option>
                <option value="employee">Employees</option>
                <option value="admin">Administrators</option>
              </select>
            </div>
          </div>

          {/* User Table */}
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-slate-800/60 text-gray-500 uppercase font-semibold text-[11px] border-b border-gray-200 dark:border-slate-800">
                  <tr>
                    <th className="px-5 py-3.5">User</th>
                    <th className="px-5 py-3.5">Assigned Role</th>
                    <th className="px-5 py-3.5">Account Status</th>
                    <th className="px-5 py-3.5">Registered</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-400">Loading user roster...</td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-400">No users match criteria.</td>
                    </tr>
                  ) : (
                    filtered.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition">
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-gray-900 dark:text-white">{u.full_name}</div>
                          <div className="text-[11px] text-gray-400 font-mono">{u.email}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <select
                            value={u.role}
                            onChange={e => handleRoleChange(u.id, e.target.value as Role)}
                            className="px-2 py-1 rounded-lg border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 font-semibold text-xs focus:outline-none"
                          >
                            <option value="customer">Customer</option>
                            <option value="employee">Employee</option>
                            <option value="admin">Administrator</option>
                          </select>
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            onClick={() => handleToggleActive(u.id, u.is_active)}
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold text-[11px] transition ${
                              u.is_active
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}
                          >
                            {u.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {u.is_active ? 'Active' : 'Suspended'}
                          </button>
                        </td>
                        <td className="px-5 py-3.5 text-gray-400">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => handleDeleteUser(u.id, u.full_name)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
