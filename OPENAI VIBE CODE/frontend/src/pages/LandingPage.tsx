import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bot, Shield, FileText, Wrench, Sparkles, ArrowRight, CheckCircle2, MessageSquare, Database } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { isAuthenticated, role } = useAuth();

  const getDashboardLink = () => {
    if (role === 'admin') return '/admin/dashboard';
    if (role === 'employee') return '/employee/dashboard';
    return '/chat';
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Navigation */}
      <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between border-b border-gray-200 dark:border-slate-800">
        <div className="flex items-center gap-2 font-bold text-xl">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
            <Bot className="w-5 h-5" />
          </div>
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            AI Customer Support Platform
          </span>
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Link
              to={getDashboardLink()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition"
            >
              Open Workspace <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition shadow-sm"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-900 mb-6">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" /> MCA Major Project • Enterprise Full-Stack AI Architecture
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white max-w-4xl mx-auto leading-tight">
          Next-Generation AI Customer Support with{' '}
          <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 bg-clip-text text-transparent">
            LangGraph, RAG & MCP
          </span>
        </h1>

        <p className="mt-6 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
          A ChatGPT-like customer experience integrated with PDF document retrieval, protocol-level MCP tool execution,
          role-based support workflows, and MongoDB Atlas database isolation.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            to={isAuthenticated ? getDashboardLink() : "/login"}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg shadow-blue-500/20 transition transform hover:-translate-y-0.5"
          >
            Launch Experience <ArrowRight className="w-5 h-5" />
          </Link>
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 font-semibold transition"
          >
            Explore Swagger API Docs
          </a>
        </div>

        {/* Demo Credentials Pill */}
        <div className="mt-10 p-4 rounded-xl bg-blue-50/80 dark:bg-slate-900/80 border border-blue-200 dark:border-slate-800 max-w-xl mx-auto text-left text-xs text-gray-600 dark:text-gray-300">
          <div className="font-semibold text-blue-700 dark:text-blue-400 mb-1 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Default Administrator Account (Auto-Provisioned):
          </div>
          <div>• Email: <span className="font-mono font-medium text-gray-900 dark:text-white">admin@aisupport.local</span></div>
          <div>• Password: <span className="font-mono font-medium text-gray-900 dark:text-white">AdminSecurePassword123!</span></div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">LangGraph Workflow</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Stateful multi-turn conversation graph with intent detection, dynamic routing, RAG retrieval, MCP tool execution, and source grounding.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">PDF RAG with Citations</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Upload customer PDFs with PyMuPDF parsing, recursive chunking, vector embeddings, and verified citations with exact page numbers.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4">
              <Wrench className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Model Context Protocol (MCP)</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Compliant MCP tool client featuring sandboxed calculators, FAQ lookup, knowledge base search, and automated ticket creation.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Three Dedicated Portals</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Isolated workspaces for Customers (ChatGPT chat), Employees (assigned queues & internal notes), and Admins (analytics & audit logs).
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Multilingual Support</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Built-in conversational fluency across English, Hindi (हिंदी), and Marathi (मराठी) with instant language selection.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4">
              <Database className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">MongoDB Atlas Ready</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Asynchronous Motor driver with Atlas Vector Search index support, refresh session revocation, and resilient local fallback.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-slate-800 py-8 text-center text-xs text-gray-500">
        AI Customer Support Platform • Developed for MCA Major Project • Python, FastAPI, LangGraph, MCP, RAG & React
      </footer>
    </div>
  );
};
