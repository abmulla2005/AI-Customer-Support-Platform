import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeIndex(index);
    setTimeout(() => setCopiedCodeIndex(null), 2000);
  };

  // Simple, robust markdown parser without heavy dependencies
  const renderFormatted = () => {
    const parts = content.split(/(```[\s\S]*?```)/g);
    let codeBlockCount = 0;

    return parts.map((part, idx) => {
      // Code block
      if (part.startsWith('```') && part.endsWith('```')) {
        const lines = part.slice(3, -3).trim().split('\n');
        const lang = lines[0].match(/^[a-zA-Z0-9_-]+$/) ? lines[0] : '';
        const code = lang ? lines.slice(1).join('\n') : lines.join('\n');
        const currentCodeIdx = codeBlockCount++;

        return (
          <div key={idx} className="my-3 rounded-lg overflow-hidden border border-gray-700 bg-slate-900 text-slate-100 font-mono text-xs">
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800 border-b border-gray-700 text-gray-400">
              <span>{lang || 'code'}</span>
              <button
                onClick={() => copyToClipboard(code, currentCodeIdx)}
                className="flex items-center gap-1 hover:text-white transition"
              >
                {copiedCodeIndex === currentCodeIdx ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy Code
                  </>
                )}
              </button>
            </div>
            <pre className="p-3 overflow-x-auto whitespace-pre leading-relaxed">{code}</pre>
          </div>
        );
      }

      // Normal text processing (paragraphs, lists, headings, bold, quotes)
      const lines = part.split('\n');
      return (
        <div key={idx} className="space-y-1.5 leading-relaxed text-sm">
          {lines.map((line, lIdx) => {
            if (!line.trim()) return <div key={lIdx} className="h-1" />;

            // Headings
            if (line.startsWith('### ')) {
              return <h3 key={lIdx} className="font-bold text-base mt-2 mb-1 text-gray-900 dark:text-gray-100">{renderInline(line.slice(4))}</h3>;
            }
            if (line.startsWith('## ')) {
              return <h2 key={lIdx} className="font-bold text-lg mt-3 mb-1 text-gray-900 dark:text-gray-100">{renderInline(line.slice(3))}</h2>;
            }
            if (line.startsWith('# ')) {
              return <h1 key={lIdx} className="font-bold text-xl mt-4 mb-2 text-gray-900 dark:text-gray-100">{renderInline(line.slice(2))}</h1>;
            }

            // Blockquote
            if (line.startsWith('> ')) {
              return (
                <blockquote key={lIdx} className="border-l-4 border-blue-500 pl-3 py-0.5 my-1.5 italic text-gray-600 dark:text-gray-300 bg-blue-50/50 dark:bg-blue-950/20 rounded-r">
                  {renderInline(line.slice(2))}
                </blockquote>
              );
            }

            // Lists
            if (line.startsWith('- ') || line.startsWith('* ')) {
              return (
                <div key={lIdx} className="flex items-start gap-2 pl-2">
                  <span className="text-blue-500 font-bold">•</span>
                  <span>{renderInline(line.slice(2))}</span>
                </div>
              );
            }
            const numMatch = line.match(/^(\d+)\.\s+(.*)/);
            if (numMatch) {
              return (
                <div key={lIdx} className="flex items-start gap-2 pl-2">
                  <span className="text-blue-600 font-semibold">{numMatch[1]}.</span>
                  <span>{renderInline(numMatch[2])}</span>
                </div>
              );
            }

            return <p key={lIdx}>{renderInline(line)}</p>;
          })}
        </div>
      );
    });
  };

  const renderInline = (text: string) => {
    // Bold **text**
    let formatted: React.ReactNode[] = [text];

    // Split bold
    formatted = formatted.flatMap((item, i) => {
      if (typeof item !== 'string') return item;
      const parts = item.split(/(\*\*.*?\*\*)/g);
      return parts.map((p, pIdx) => {
        if (p.startsWith('**') && p.endsWith('**')) {
          return <strong key={pIdx} className="font-semibold text-gray-900 dark:text-white">{p.slice(2, -2)}</strong>;
        }
        return p;
      });
    });

    // Split inline code `code`
    formatted = formatted.flatMap((item, i) => {
      if (typeof item !== 'string') return item;
      const parts = item.split(/(`.*?`)/g);
      return parts.map((p, pIdx) => {
        if (p.startsWith('`') && p.endsWith('`')) {
          return (
            <code key={pIdx} className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-mono text-xs">
              {p.slice(1, -1)}
            </code>
          );
        }
        return p;
      });
    });

    return formatted;
  };

  return <div className="markdown-body">{renderFormatted()}</div>;
};
