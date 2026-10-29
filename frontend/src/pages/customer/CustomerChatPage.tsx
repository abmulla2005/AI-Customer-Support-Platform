import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Message, MessageSource, DocumentItem } from '../../types';
import { Navbar } from '../../components/Navbar';
import { Sidebar } from '../../components/Sidebar';
import { MarkdownRenderer } from '../../components/MarkdownRenderer';
import { CitationsView } from '../../components/CitationsView';
import {
  Send,
  Square,
  RefreshCw,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  Download,
  FileText,
  Languages,
  Sparkles,
  Bot,
  User,
  Paperclip,
  X
} from 'lucide-react';

export const CustomerChatPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryChatId = searchParams.get('id');

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(queryChatId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [language, setLanguage] = useState<'en' | 'hi' | 'mr'>('en');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingSources, setStreamingSources] = useState<MessageSource[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // PDF context attachment
  const [availableDocs, setAvailableDocs] = useState<DocumentItem[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [showDocPicker, setShowDocPicker] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  // Load available documents for attachment
  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const docs = await api.listDocuments();
        setAvailableDocs(docs.filter(d => d.status === 'indexed'));
      } catch (err) {
        console.error('Error fetching documents', err);
      }
    };
    fetchDocs();
  }, []);

  // Load thread messages when activeChatId changes
  useEffect(() => {
    if (queryChatId && queryChatId !== activeChatId) {
      setActiveChatId(queryChatId);
    }
  }, [queryChatId]);

  useEffect(() => {
    const fetchThread = async () => {
      if (!activeChatId) {
        setMessages([]);
        return;
      }
      try {
        const res = await api.getChat(activeChatId);
        setMessages(res.messages || []);
      } catch (err) {
        console.error('Error fetching chat history', err);
      }
    };
    fetchThread();
  }, [activeChatId]);

  const handleNewChat = () => {
    setActiveChatId(null);
    setSearchParams({});
    setMessages([]);
    setInputMessage('');
    setStreamingContent('');
    setSelectedDocIds([]);
  };

  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId);
    setSearchParams({ id: chatId });
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    let chatId = activeChatId;

    // Create chat if not exists
    if (!chatId) {
      try {
        const newThread = await api.createChat(inputMessage.trim().slice(0, 30));
        chatId = newThread.id;
        setActiveChatId(chatId);
        setSearchParams({ id: chatId });
      } catch (err) {
        console.error('Failed to create thread', err);
        return;
      }
    }

    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      thread_id: chatId,
      user_id: user?.id || '',
      role: 'user',
      content: inputMessage.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    const currentInput = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);
    setStreamingContent('');
    setStreamingSources([]);

    // SSE Streaming
    try {
      abortControllerRef.current = new AbortController();
      const token = localStorage.getItem('access_token');

      const response = await fetch(`/api/chats/${chatId}/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: currentInput,
          language,
          selected_document_ids: selectedDocIds.length > 0 ? selectedDocIds : undefined,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error('Streaming failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let accumulated = '';
      let capturedSources: MessageSource[] = [];

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'chunk') {
                accumulated += data.content;
                setStreamingContent(accumulated);
              } else if (data.type === 'done') {
                accumulated = data.content || accumulated;
                capturedSources = data.sources || [];
                setStreamingContent(accumulated);
                setStreamingSources(capturedSources);
              }
            } catch {}
          }
        }
      }

      // Add finalized assistant message
      const asstMsg: Message = {
        id: `asst-${Date.now()}`,
        thread_id: chatId,
        user_id: 'assistant',
        role: 'assistant',
        content: accumulated,
        sources: capturedSources,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, asstMsg]);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Stream generation aborted by user.');
      } else {
        console.error('Error during streaming', err);
        // Fallback message
        const errMsg: Message = {
          id: `err-${Date.now()}`,
          thread_id: chatId,
          user_id: 'assistant',
          role: 'assistant',
          content: 'I apologize, but I encountered an error processing your request. Please try again.',
          created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, errMsg]);
      }
    } finally {
      setIsLoading(false);
      setStreamingContent('');
      setStreamingSources([]);
      abortControllerRef.current = null;
    }
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  };

  const regenerateAnswer = () => {
    if (messages.length === 0 || isLoading) return;
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMsg) {
      setInputMessage(lastUserMsg.content);
      // Remove last assistant message
      setMessages(prev => {
        const last = prev[prev.length - 1];
        return last.role === 'assistant' ? prev.slice(0, -1) : prev;
      });
    }
  };

  const copyAnswer = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleFeedback = async (messageId: string, feedback: 'like' | 'dislike') => {
    if (!activeChatId) return;
    try {
      await api.submitFeedback(activeChatId, messageId, feedback);
      setMessages(prev =>
        prev.map(m => (m.id === messageId ? { ...m, feedback } : m))
      );
    } catch (err) {
      console.error('Feedback submission failed', err);
    }
  };

  const exportConversation = (format: 'markdown' | 'json') => {
    if (!activeChatId) return;
    window.open(`/api/chats/${activeChatId}/export?format=${format}`, '_blank');
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 overflow-hidden">
      <Navbar toggleSidebar={() => setSidebarOpen(prev => !prev)} />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          activeChatId={activeChatId || undefined}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
        />

        {/* Main Chat Interface */}
        <main className="flex-1 flex flex-col h-full bg-white dark:bg-slate-950 overflow-hidden relative">
          {/* Top Chat Bar */}
          <div className="h-12 border-b border-gray-200 dark:border-slate-800 px-4 flex items-center justify-between text-xs bg-white/70 dark:bg-slate-950/70 backdrop-blur">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                AI Customer Support Model:
              </span>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono text-[11px] border border-blue-200 dark:border-blue-900 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-blue-500" /> LangGraph Orchestrated RAG
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Language Selector */}
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 rounded-lg p-0.5">
                <Languages className="w-3.5 h-3.5 text-gray-500 ml-1.5" />
                <button
                  onClick={() => setLanguage('en')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                    language === 'en'
                      ? 'bg-white dark:bg-slate-700 shadow-xs text-blue-600 dark:text-blue-400'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  English
                </button>
                <button
                  onClick={() => setLanguage('hi')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                    language === 'hi'
                      ? 'bg-white dark:bg-slate-700 shadow-xs text-blue-600 dark:text-blue-400'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  हिंदी
                </button>
                <button
                  onClick={() => setLanguage('mr')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                    language === 'mr'
                      ? 'bg-white dark:bg-slate-700 shadow-xs text-blue-600 dark:text-blue-400'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  मराठी
                </button>
              </div>

              {/* Export Chat */}
              {activeChatId && messages.length > 0 && (
                <button
                  onClick={() => exportConversation('markdown')}
                  className="flex items-center gap-1 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition"
                  title="Export Chat as Markdown"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[11px]">Export</span>
                </button>
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 max-w-4xl w-full mx-auto">
            {messages.length === 0 && !isLoading ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto my-auto py-12">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 mb-4">
                  <Bot className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">How can I assist you today?</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 mb-6 leading-relaxed">
                  Ask about policies, billing, warranty, or attach your PDF documents to ask questions with verified page citations.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full text-left">
                  <button
                    onClick={() => setInputMessage('What is your standard 30-day refund policy?')}
                    className="p-3 text-xs rounded-xl border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-900 transition"
                  >
                    <div className="font-semibold text-blue-600 dark:text-blue-400 mb-1">Refund Policy</div>
                    <div className="text-gray-500 text-[11px]">Check money back and return terms</div>
                  </button>
                  <button
                    onClick={() => setInputMessage('Calculate (5000 * 0.18) + 250')}
                    className="p-3 text-xs rounded-xl border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-900 transition"
                  >
                    <div className="font-semibold text-indigo-600 dark:text-indigo-400 mb-1">MCP Calculator</div>
                    <div className="text-gray-500 text-[11px]">Perform mathematical calculations</div>
                  </button>
                  <button
                    onClick={() => setInputMessage('Please raise a high priority support ticket for my delayed shipment.')}
                    className="p-3 text-xs rounded-xl border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-900 transition"
                  >
                    <div className="font-semibold text-emerald-600 dark:text-emerald-400 mb-1">Create Support Ticket</div>
                    <div className="text-gray-500 text-[11px]">Escalate issues to human agents</div>
                  </button>
                  <button
                    onClick={() => setInputMessage('What documents do I need for warranty claim?')}
                    className="p-3 text-xs rounded-xl border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-900 transition"
                  >
                    <div className="font-semibold text-purple-600 dark:text-purple-400 mb-1">Warranty Claims</div>
                    <div className="text-gray-500 text-[11px]">Explore product coverage rules</div>
                  </button>
                </div>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isUser = msg.role === 'user';

                return (
                  <div
                    key={msg.id || index}
                    className={`flex gap-3 sm:gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 shadow-xs ${
                        isUser
                          ? 'bg-blue-600 text-white rounded-br-none'
                          : 'bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-bl-none text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      {isUser ? (
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      ) : (
                        <div>
                          <MarkdownRenderer content={msg.content} />
                          {msg.sources && msg.sources.length > 0 && (
                            <CitationsView sources={msg.sources} />
                          )}

                          {/* Assistant Actions Bar */}
                          <div className="mt-3 pt-2 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs text-gray-400">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => copyAnswer(msg.content, index)}
                                className="hover:text-gray-700 dark:hover:text-gray-200 transition p-1"
                                title="Copy answer"
                              >
                                {copiedIndex === index ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                onClick={() => handleFeedback(msg.id, 'like')}
                                className={`p-1 hover:text-emerald-500 transition ${
                                  msg.feedback === 'like' ? 'text-emerald-500 font-bold' : ''
                                }`}
                                title="Helpful"
                              >
                                <ThumbsUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleFeedback(msg.id, 'dislike')}
                                className={`p-1 hover:text-rose-500 transition ${
                                  msg.feedback === 'dislike' ? 'text-rose-500 font-bold' : ''
                                }`}
                                title="Not helpful"
                              >
                                <ThumbsDown className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {index === messages.length - 1 && (
                              <button
                                onClick={regenerateAnswer}
                                className="flex items-center gap-1 hover:text-blue-600 transition p-1 text-[11px]"
                              >
                                <RefreshCw className="w-3 h-3" /> Regenerate
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {isUser && (
                      <div className="w-8 h-8 rounded-xl bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-gray-300 flex items-center justify-center flex-shrink-0 text-xs font-semibold mt-0.5">
                        {user?.full_name?.charAt(0) || <User className="w-4 h-4" />}
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Live Streaming Response Box */}
            {isLoading && (
              <div className="flex gap-3 sm:gap-4 justify-start">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5 animate-pulse">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-bl-none text-gray-900 dark:text-gray-100 shadow-xs">
                  {streamingContent ? (
                    <div>
                      <div className="typing-cursor">
                        <MarkdownRenderer content={streamingContent} />
                      </div>
                      {streamingSources.length > 0 && (
                        <CitationsView sources={streamingSources} />
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" />
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce delay-100" />
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce delay-200" />
                      <span className="ml-1">Synthesizing support response...</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Selected Document Attachment Bar */}
          {selectedDocIds.length > 0 && (
            <div className="max-w-4xl w-full mx-auto px-4 py-1.5 flex items-center gap-2 overflow-x-auto text-xs bg-blue-50/60 dark:bg-slate-900 border-t border-blue-100 dark:border-slate-800">
              <span className="text-blue-700 dark:text-blue-300 font-medium flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" /> Attached RAG Context ({selectedDocIds.length}):
              </span>
              {selectedDocIds.map(docId => {
                const doc = availableDocs.find(d => d.id === docId);
                return (
                  <span
                    key={docId}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-blue-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 text-[11px]"
                  >
                    {doc?.filename || 'Document'}
                    <button
                      onClick={() => setSelectedDocIds(prev => prev.filter(id => id !== docId))}
                      className="hover:text-rose-500 ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          {/* Input Box Footer */}
          <div className="border-t border-gray-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-950">
            <div className="max-w-4xl mx-auto">
              <form onSubmit={handleSendMessage} className="relative flex items-end gap-2 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-800 rounded-2xl p-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition shadow-sm">
                {/* Document Picker Toggle */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowDocPicker(prev => !prev)}
                    className={`p-2 rounded-xl transition ${
                      selectedDocIds.length > 0
                        ? 'text-blue-600 bg-blue-50 dark:bg-blue-950'
                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-slate-800'
                    }`}
                    title="Attach Uploaded PDF for RAG retrieval"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  {/* Doc Picker Dropdown */}
                  {showDocPicker && (
                    <div className="absolute bottom-12 left-0 w-72 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-xl p-3 z-30">
                      <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center justify-between">
                        <span>Select Document Context</span>
                        <button onClick={() => setShowDocPicker(false)}>
                          <X className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                      </div>
                      {availableDocs.length === 0 ? (
                        <div className="text-[11px] text-gray-400 py-2 text-center">
                          No indexed PDFs found. Upload PDFs in "My Documents".
                        </div>
                      ) : (
                        <div className="max-h-48 overflow-y-auto space-y-1">
                          {availableDocs.map(doc => {
                            const isSelected = selectedDocIds.includes(doc.id);
                            return (
                              <div
                                key={doc.id}
                                onClick={() => {
                                  setSelectedDocIds(prev =>
                                    isSelected ? prev.filter(id => id !== doc.id) : [...prev, doc.id]
                                  );
                                }}
                                className={`flex items-center gap-2 p-1.5 rounded-lg text-xs cursor-pointer transition ${
                                  isSelected
                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-medium'
                                    : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300'
                                }`}
                              >
                                <input type="checkbox" checked={isSelected} readOnly className="rounded text-blue-600" />
                                <span className="truncate flex-1">{doc.filename}</span>
                                <span className="text-[10px] text-gray-400">{doc.num_pages}p</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Textarea */}
                <textarea
                  rows={1}
                  value={inputMessage}
                  onChange={e => setInputMessage(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Ask a support question, calculate with MCP, or query your PDFs..."
                  className="flex-1 bg-transparent border-0 resize-none py-2 px-1 text-sm focus:outline-none text-gray-900 dark:text-white max-h-32 placeholder:text-gray-400"
                />

                {/* Action Button: Send or Stop */}
                {isLoading ? (
                  <button
                    type="button"
                    onClick={stopGeneration}
                    className="p-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition flex-shrink-0"
                    title="Stop generation"
                  >
                    <Square className="w-4 h-4 fill-white" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!inputMessage.trim()}
                    className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 transition flex-shrink-0"
                    title="Send message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                )}
              </form>

              <div className="flex items-center justify-between text-[11px] text-gray-400 mt-2 px-1">
                <span>Enter to send • Shift + Enter for new line</span>
                <span>Grounds responses in verified MongoDB Atlas RAG vectors</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
