import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Bot, Lock, Mail, AlertCircle, ArrowRight, Shield, Headset, User } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login({ email, password });
      if (user.role === 'admin') navigate('/admin/dashboard');
      else if (user.role === 'employee') navigate('/employee/dashboard');
      else navigate('/chat');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillQuickAccount = (eMail: string, pWord: string) => {
    setEmail(eMail);
    setPassword(pWord);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-gray-100">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-xl p-8">
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2 font-bold text-xl mb-2">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white">
              <Bot className="w-5 h-5" />
            </div>
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              AI Support Platform
            </span>
          </Link>
          <h2 className="text-xl font-bold mt-2">Sign in to your account</h2>
          <p className="text-xs text-gray-500 mt-1">Select a role or enter your credentials</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                Password
              </label>
              <Link to="/forgot-password" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In'} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick evaluation accounts */}
        <div className="mt-6 pt-5 border-t border-gray-200 dark:border-slate-800">
          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-center mb-2">
            Quick Demo Accounts
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => fillQuickAccount('admin@aisupport.com', 'AdminSecurePassword123!')}
              className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800 text-xs flex flex-col items-center gap-1 text-rose-600 dark:text-rose-400 transition"
            >
              <Shield className="w-4 h-4" />
              <span className="font-semibold text-[11px]">Admin</span>
            </button>
            <button
              type="button"
              onClick={() => fillQuickAccount('employee@aisupport.com', 'EmployeePassword123!')}
              className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800 text-xs flex flex-col items-center gap-1 text-amber-600 dark:text-amber-400 transition"
            >
              <Headset className="w-4 h-4" />
              <span className="font-semibold text-[11px]">Employee</span>
            </button>
            <button
              type="button"
              onClick={() => fillQuickAccount('customer@aisupport.com', 'CustomerPassword123!')}
              className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800 text-xs flex flex-col items-center gap-1 text-blue-600 dark:text-blue-400 transition"
            >
              <User className="w-4 h-4" />
              <span className="font-semibold text-[11px]">Customer</span>
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 mt-6">
          Don't have an account yet?{' '}
          <Link to="/signup" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
            Sign up now
          </Link>
        </p>
      </div>
    </div>
  );
};
