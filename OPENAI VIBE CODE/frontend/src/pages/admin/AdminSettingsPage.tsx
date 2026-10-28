import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Navbar } from '../../components/Navbar';
import { Sidebar } from '../../components/Sidebar';
import { Settings, Save, CheckCircle2, Bot, Wrench, FileText, Play } from 'lucide-react';

export const AdminSettingsPage: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settings, setSettings] = useState<any>({
    openrouter_model: 'anthropic/claude-3-haiku',
    temperature: 0.2,
    rag_chunk_size: 600,
    rag_chunk_overlap: 80,
    mcp_enabled_tools: [
      'calculate',
      'search_faq',
      'search_company_knowledge',
      'lookup_support_ticket',
      'create_support_ticket',
      'search_authorized_documents',
    ],
    max_upload_size_mb: 25,
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');

  // MCP tool tester
  const [selectedTool, setSelectedTool] = useState('calculate');
  const [toolArgs, setToolArgs] = useState('{"expression": "(1250 * 4) + 100"}');
  const [testResult, setTestResult] = useState<any>(null);
  const [testingTool, setTestingTool] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await api.getAdminSettings();
        if (data) setSettings(data);
      } catch (err) {
        console.error('Failed to load settings', err);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess('');
    try {
      await api.updateAdminSettings(settings);
      setSaveSuccess('System settings & model parameters updated successfully.');
    } catch (err) {
      console.error('Failed to update settings', err);
    } finally {
      setSaving(false);
    }
  };

  const toggleTool = (toolName: string) => {
    setSettings((prev: any) => {
      const current = prev.mcp_enabled_tools || [];
      const updated = current.includes(toolName)
        ? current.filter((t: string) => t !== toolName)
        : [...current, toolName];
      return { ...prev, mcp_enabled_tools: updated };
    });
  };

  const handleTestTool = async () => {
    setTestingTool(true);
    setTestResult(null);
    try {
      let parsed = {};
      try {
        parsed = JSON.parse(toolArgs);
      } catch {
        alert('Invalid JSON in arguments');
        setTestingTool(false);
        return;
      }
      const res = await api.executeMcpTool(selectedTool, parsed);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ error: err.message });
    } finally {
      setTestingTool(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 overflow-hidden">
      <Navbar toggleSidebar={() => setSidebarOpen(prev => !prev)} />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-5xl w-full mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Settings className="w-6 h-6 text-rose-600" /> Platform & AI Workflow Configuration
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Configure OpenRouter LLM engines, LangGraph hyper-parameters, and Model Context Protocol (MCP) tool permissions.
            </p>
          </div>

          {saveSuccess && (
            <div className="mb-6 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{saveSuccess}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            {/* LLM Engine */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Bot className="w-4 h-4 text-blue-600" /> LLM Model Selection (OpenRouter)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Primary Reasoning Engine
                  </label>
                  <select
                    value={settings.openrouter_model}
                    onChange={e => setSettings({ ...settings, openrouter_model: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 font-mono focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="anthropic/claude-3-haiku">anthropic/claude-3-haiku (Fast & Accurate)</option>
                    <option value="openai/gpt-4o-mini">openai/gpt-4o-mini (Cost-effective)</option>
                    <option value="meta-llama/llama-3-8b-instruct">meta-llama/llama-3-8b-instruct (Open-Weights)</option>
                    <option value="google/gemini-flash-1.5">google/gemini-flash-1.5 (High Context)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Temperature ({settings.temperature})
                  </label>
                  <input
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.05"
                    value={settings.temperature}
                    onChange={e => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
                    className="w-full accent-rose-600"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                    <span>0.0 (Deterministic / Grounded)</span>
                    <span>1.0 (Creative)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* MCP Allowlist */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Wrench className="w-4 h-4 text-purple-600" /> Model Context Protocol (MCP) Permitted Tools
              </h3>
              <p className="text-xs text-gray-500">
                Enable or disable protocol-level tools available for LangGraph AI execution.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { name: 'calculate', label: 'MCP Calculator', desc: 'Secure arithmetic and financial calculations' },
                  { name: 'search_faq', label: 'FAQ Search', desc: 'Pre-indexed knowledge on returns, billing, warranty' },
                  { name: 'search_company_knowledge', label: 'Knowledge Base Search', desc: 'Company SOPs and internal procedures' },
                  { name: 'lookup_support_ticket', label: 'Support Ticket Lookup', desc: 'Verify customer ticket statuses' },
                  { name: 'create_support_ticket', label: 'Support Ticket Creation', desc: 'Escalate customer issues to staff' },
                  { name: 'search_authorized_documents', label: 'Document Search', desc: 'Query user uploaded PDFs' },
                ].map(tool => {
                  const isChecked = settings.mcp_enabled_tools?.includes(tool.name);
                  return (
                    <div
                      key={tool.name}
                      onClick={() => toggleTool(tool.name)}
                      className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                        isChecked
                          ? 'border-purple-500 bg-purple-50/40 dark:bg-purple-950/20'
                          : 'border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                        className="mt-0.5 rounded text-purple-600"
                      />
                      <div>
                        <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">{tool.label}</div>
                        <div className="text-[11px] text-gray-400 mt-0.5">{tool.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RAG Parameters */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" /> RAG Chunking & Vector Ingestion
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Chunk Size (Characters)
                  </label>
                  <input
                    type="number"
                    value={settings.rag_chunk_size}
                    onChange={e => setSettings({ ...settings, rag_chunk_size: parseInt(e.target.value) || 600 })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Chunk Overlap (Characters)
                  </label>
                  <input
                    type="number"
                    value={settings.rag_chunk_overlap}
                    onChange={e => setSettings({ ...settings, rag_chunk_overlap: parseInt(e.target.value) || 80 })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Max Upload File Size (MB)
                  </label>
                  <input
                    type="number"
                    value={settings.max_upload_size_mb}
                    onChange={e => setSettings({ ...settings, max_upload_size_mb: parseInt(e.target.value) || 25 })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 font-mono focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-2 transition disabled:opacity-50 shadow-sm"
              >
                <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </form>

          {/* Live MCP Tool Execution Testing Console */}
          <div className="mt-8 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Play className="w-4 h-4 text-purple-600" /> Interactive MCP Tool Execution Sandbox
            </h3>
            <p className="text-xs text-gray-500">
              Directly invoke MCP protocol tools with schema-validated JSON payloads to test reliability.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Select Tool to Test
                </label>
                <select
                  value={selectedTool}
                  onChange={e => {
                    const t = e.target.value;
                    setSelectedTool(t);
                    if (t === 'calculate') setToolArgs('{"expression": "(1250 * 4) + 100"}');
                    else if (t === 'search_faq') setToolArgs('{"topic": "refund policy"}');
                    else if (t === 'search_company_knowledge') setToolArgs('{"keyword": "warranty"}');
                    else if (t === 'lookup_support_ticket') setToolArgs('{"ticket_id": "TICK-TEST"}');
                    else if (t === 'create_support_ticket') setToolArgs('{"title": "Test Issue", "description": "System diagnostic ticket", "priority": "medium"}');
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 font-semibold focus:outline-none"
                >
                  <option value="calculate">calculate</option>
                  <option value="search_faq">search_faq</option>
                  <option value="search_company_knowledge">search_company_knowledge</option>
                  <option value="lookup_support_ticket">lookup_support_ticket</option>
                  <option value="create_support_ticket">create_support_ticket</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  JSON Arguments
                </label>
                <input
                  type="text"
                  value={toolArgs}
                  onChange={e => setToolArgs(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 font-mono focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleTestTool}
                disabled={testingTool}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
              >
                {testingTool ? 'Invoking MCP...' : 'Execute Tool Protocol'}
              </button>
            </div>

            {testResult && (
              <div className="mt-2 p-3 rounded-xl bg-slate-900 border border-gray-700 text-slate-100 font-mono text-xs">
                <div className="text-[10px] text-gray-400 mb-1">Execution Response:</div>
                <pre className="overflow-x-auto whitespace-pre-wrap">{JSON.stringify(testResult, null, 2)}</pre>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
