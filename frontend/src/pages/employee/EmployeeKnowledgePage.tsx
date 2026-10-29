import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { CompanyKnowledge } from '../../types';
import { Navbar } from '../../components/Navbar';
import { Sidebar } from '../../components/Sidebar';
import { BookOpen, Search, Tag, Clock } from 'lucide-react';

export const EmployeeKnowledgePage: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [articles, setArticles] = useState<CompanyKnowledge[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchKnowledge = async () => {
      try {
        const list = await api.listCompanyKnowledge();
        setArticles(list);
      } catch (err) {
        console.error('Failed to load knowledge base', err);
      } finally {
        setLoading(false);
      }
    };
    fetchKnowledge();
  }, []);

  const filtered = articles.filter(a =>
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.category.toLowerCase().includes(search.toLowerCase()) ||
    a.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 overflow-hidden">
      <Navbar toggleSidebar={() => setSidebarOpen(prev => !prev)} />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-5xl w-full mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-amber-600" /> Employee Knowledge Base & SOPs
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Internal reference guides, troubleshooting workflows, and customer communication guidelines.
            </p>
          </div>

          <div className="relative mb-6">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search SOP articles, policy terms, troubleshooting..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
            />
          </div>

          {loading ? (
            <div className="text-center py-12 text-xs text-gray-400">Loading articles...</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-center text-xs text-gray-400">
              No matching knowledge articles found.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map(art => (
                <div
                  key={art.id}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs hover:border-amber-400 transition"
                >
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      {art.category}
                    </span>
                    <span className="text-[11px] text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(art.updated_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">
                    {art.title}
                  </h3>

                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap mb-4">
                    {art.content}
                  </p>

                  {art.tags && art.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-2 border-t border-gray-100 dark:border-slate-800">
                      {art.tags.map(t => (
                        <span key={t} className="text-[10px] text-gray-400 flex items-center gap-0.5">
                          <Tag className="w-2.5 h-2.5" /> {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
