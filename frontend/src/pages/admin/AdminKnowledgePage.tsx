import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { CompanyKnowledge } from '../../types';
import { Navbar } from '../../components/Navbar';
import { Sidebar } from '../../components/Sidebar';
import { BookOpen, Plus, Trash2, Tag, X, CheckCircle2 } from 'lucide-react';

export const AdminKnowledgePage: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [articles, setArticles] = useState<CompanyKnowledge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Policies');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchKnowledge = async () => {
    try {
      setLoading(true);
      const list = await api.listCompanyKnowledge();
      setArticles(list);
    } catch (err) {
      console.error('Failed to load knowledge', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKnowledge();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setSubmitting(true);
    try {
      const tags = tagsInput.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
      const created = await api.createCompanyKnowledge({
        title,
        category,
        content,
        tags,
        is_published: true,
      });
      setArticles(prev => [created, ...prev]);
      setShowAddModal(false);
      setTitle('');
      setContent('');
      setTagsInput('');
    } catch (err) {
      console.error('Failed to create article', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, artTitle: string) => {
    if (!confirm(`Delete article "${artTitle}"?`)) return;
    try {
      await api.deleteCompanyKnowledge(id);
      setArticles(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error('Failed to delete article', err);
    }
  };

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
                <BookOpen className="w-6 h-6 text-rose-600" /> Knowledge Base Management
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                Publish official company documentation, policies, and standard operating procedures.
              </p>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-2 transition shadow-sm"
            >
              <Plus className="w-4 h-4" /> Publish New Article
            </button>
          </div>

          {/* Articles Grid */}
          {loading ? (
            <div className="text-center py-12 text-xs text-gray-400">Loading knowledge base...</div>
          ) : articles.length === 0 ? (
            <div className="p-10 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-center text-xs text-gray-400">
              No articles published yet. Click "Publish New Article" above.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {articles.map(art => (
                <div
                  key={art.id}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                        {art.category}
                      </span>
                      <button
                        onClick={() => handleDelete(art.id, art.title)}
                        className="text-gray-400 hover:text-rose-600 transition"
                        title="Delete article"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">
                      {art.title}
                    </h3>

                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap mb-4">
                      {art.content}
                    </p>
                  </div>

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

          {/* Add Article Modal */}
          {showAddModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-40">
              <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl relative">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X className="w-5 h-5" />
                </button>

                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                  Publish Knowledge Base Article
                </h2>
                <p className="text-xs text-gray-500 mb-4">
                  Information saved here is queryable by both AI Customer Support workflows and Employee workspaces.
                </p>

                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Article Title
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="e.g. Standard Return & Replacement Terms"
                      className="w-full px-3 py-2 text-sm rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Category
                      </label>
                      <input
                        type="text"
                        required
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        placeholder="e.g. Policies, Billing, Shipping"
                        className="w-full px-3 py-2 text-sm rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Tags (comma separated)
                      </label>
                      <input
                        type="text"
                        value={tagsInput}
                        onChange={e => setTagsInput(e.target.value)}
                        placeholder="refund, return, warranty"
                        className="w-full px-3 py-2 text-sm rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Article Content
                    </label>
                    <textarea
                      rows={5}
                      required
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      placeholder="Detailed content for customer support reference..."
                      className="w-full px-3 py-2 text-sm rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800 rounded-xl transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-5 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition disabled:opacity-50"
                    >
                      {submitting ? 'Publishing...' : 'Publish Article'}
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
