import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { DocumentItem, MessageSource } from '../../types';
import { Navbar } from '../../components/Navbar';
import { Sidebar } from '../../components/Sidebar';
import {
  Upload,
  FileText,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Layers,
  ChevronRight,
} from 'lucide-react';

export const CustomerDocumentsPage: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  // Semantic query test
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [testQuery, setTestQuery] = useState('');
  const [queryResults, setQueryResults] = useState<MessageSource[]>([]);
  const [querying, setQuerying] = useState(false);

  const fetchDocs = async () => {
    try {
      setLoading(true);
      const list = await api.listDocuments();
      setDocuments(list);
      if (list.length > 0 && !selectedDocId) {
        setSelectedDocId(list[0].id);
      }
    } catch (err: any) {
      console.error('Error fetching documents', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError('Only PDF documents are supported.');
      return;
    }

    setUploadError('');
    setUploadSuccess('');
    setUploading(true);

    try {
      const doc = await api.uploadDocument(file);
      setDocuments(prev => [doc, ...prev]);
      setSelectedDocId(doc.id);
      setUploadSuccess(`Successfully extracted and indexed "${file.name}" into ${doc.num_pages} pages.`);
    } catch (err: any) {
      setUploadError(err.message || 'PDF processing and embedding failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (docId: string, filename: string) => {
    if (!confirm(`Are you sure you want to delete "${filename}" and its vector index?`)) return;
    try {
      await api.deleteDocument(docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
      if (selectedDocId === docId) {
        setSelectedDocId(null);
        setQueryResults([]);
      }
    } catch (err) {
      console.error('Failed to delete document', err);
    }
  };

  const handleQueryTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocId || !testQuery.trim() || querying) return;

    setQuerying(true);
    try {
      const res = await api.queryDocument(selectedDocId, testQuery);
      setQueryResults(res.results || []);
    } catch (err) {
      console.error('Error querying document', err);
    } finally {
      setQuerying(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 overflow-hidden">
      <Navbar toggleSidebar={() => setSidebarOpen(prev => !prev)} />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-6xl w-full mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600" /> My PDF Documents & RAG Index
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Upload PDF manuals, invoices, reports, or policies. The platform chunks, embeds, and indexes them into MongoDB Atlas Vector Search.
            </p>
          </div>

          {/* Upload Dropzone */}
          <div className="mb-8 p-6 rounded-2xl bg-white dark:bg-slate-900 border-2 border-dashed border-gray-300 dark:border-slate-800 hover:border-blue-500 transition text-center relative">
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileUpload}
              disabled={uploading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            <div className="flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
              </div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {uploading ? 'Extracting, Chunking & Indexing PDF...' : 'Click to upload or drag & drop PDF'}
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                PyMuPDF parser • Max file size: 25MB • Strict user data isolation
              </p>
            </div>
          </div>

          {uploadError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {uploadSuccess && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{uploadSuccess}</span>
            </div>
          )}

          {/* Document list & Semantic search tester */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Documents List */}
            <div className="lg:col-span-1 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 px-1 mb-2">
                Uploaded PDFs ({documents.length})
              </div>

              {loading ? (
                <div className="text-xs text-gray-400 p-4 text-center">Loading documents...</div>
              ) : documents.length === 0 ? (
                <div className="p-6 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center text-xs text-gray-400">
                  No documents uploaded yet. Upload a PDF above to begin.
                </div>
              ) : (
                documents.map(doc => {
                  const isSelected = doc.id === selectedDocId;

                  return (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDocId(doc.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30'
                          : 'border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <FileText className={`w-5 h-5 flex-shrink-0 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                        <div className="overflow-hidden">
                          <div className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate" title={doc.filename}>
                            {doc.filename}
                          </div>
                          <div className="text-[10px] text-gray-400 flex items-center gap-2 mt-0.5">
                            <span>{doc.num_pages} pages</span>
                            <span>•</span>
                            <span className="capitalize">{doc.scope} scope</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleDelete(doc.id, doc.filename);
                          }}
                          className="p-1 text-gray-400 hover:text-rose-600 transition"
                          title="Delete PDF & Vectors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Semantic Query Tester */}
            <div className="lg:col-span-2">
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm">
                <div className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                  RAG Citation & Vector Search Inspector
                </div>
                <p className="text-xs text-gray-500 mb-4">
                  Test semantic similarity retrieval against your selected PDF to inspect citations and page numbers before chatting.
                </p>

                <form onSubmit={handleQueryTest} className="flex gap-2 mb-4">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                    <input
                      type="text"
                      disabled={!selectedDocId}
                      value={testQuery}
                      onChange={e => setTestQuery(e.target.value)}
                      placeholder={selectedDocId ? "Ask a question about this document..." : "Select a document first"}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!selectedDocId || !testQuery.trim() || querying}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-40"
                  >
                    {querying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Query
                  </button>
                </form>

                {/* Results display */}
                <div className="space-y-3">
                  {queryResults.length === 0 ? (
                    <div className="py-8 text-center text-xs text-gray-400 border border-dashed border-gray-200 dark:border-slate-800 rounded-xl">
                      {selectedDocId
                        ? "Enter a query above to test RAG retrieval on this document."
                        : "No document selected."}
                    </div>
                  ) : (
                    queryResults.map((src, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl border border-blue-100 dark:border-slate-800 bg-blue-50/30 dark:bg-slate-800/40"
                      >
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5" /> Result #{i + 1} • Page {src.page_number}
                          </span>
                          <span className="text-[11px] font-mono text-gray-500">
                            Relevance: {(src.relevance_score * 100).toFixed(1)}%
                          </span>
                        </div>
                        <p className="text-xs text-gray-700 dark:text-gray-300 italic leading-relaxed">
                          "{src.snippet}"
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
