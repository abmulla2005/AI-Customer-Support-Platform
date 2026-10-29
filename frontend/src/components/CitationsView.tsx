import React, { useState } from 'react';
import { MessageSource } from '../types';
import { FileText, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

interface CitationsViewProps {
  sources: MessageSource[];
}

export const CitationsView: React.FC<CitationsViewProps> = ({ sources }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-slate-800">
      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
        <FileText className="w-3.5 h-3.5 text-blue-500" />
        <span>Verified Document Sources ({sources.length}):</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {sources.map((src, idx) => {
          const isExpanded = expandedIndex === idx;

          return (
            <div
              key={idx}
              className="text-xs border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-lg p-2.5 shadow-sm hover:border-blue-400 dark:hover:border-blue-600 transition"
            >
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedIndex(isExpanded ? null : idx)}
              >
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <span className="w-5 h-5 rounded bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                    {idx + 1}
                  </span>
                  <span className="font-medium text-gray-800 dark:text-gray-200 truncate" title={src.filename}>
                    {src.filename}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-gray-500 flex-shrink-0">
                  <span className="bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono">
                    p. {src.page_number}
                  </span>
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </div>
              </div>

              {isExpanded && (
                <div className="mt-2 pt-2 border-t border-gray-100 dark:border-slate-800 text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed italic bg-gray-50/50 dark:bg-slate-800/40 p-2 rounded">
                  "{src.snippet}"
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
