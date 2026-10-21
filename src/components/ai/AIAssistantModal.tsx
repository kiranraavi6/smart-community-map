import React, { useState } from 'react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  Compass, 
  ChevronRight,
  Loader2
} from 'lucide-react';
import { CommunityAsset } from '../../types';
import { queryCommunityAssistant, AIQueryResponse } from '../../services/aiService';
import { CategoryBadge } from '../common/CategoryBadge';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: CommunityAsset[];
  userLocation: { lat: number; lng: number } | null;
  onSelectAsset: (asset: CommunityAsset) => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  responseObj?: AIQueryResponse;
}

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  assets,
  userLocation,
  onSelectAsset
}) => {
  const [queryInput, setQueryInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I am your Community Resource Assistant. I search verified civic records in real-time. Ask me questions like:\n• "Where is the nearest 24/7 hospital with trauma care?"\n• "Show accessible drinking water facilities in Vijayawada."\n• "Find public libraries and educational resources nearby."'
    }
  ]);

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const q = textToSend || queryInput;
    if (!q.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: q };
    setMessages(prev => [...prev, userMsg]);
    setQueryInput('');
    setLoading(true);

    try {
      const response = await queryCommunityAssistant(q, assets, userLocation || undefined);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: response.summary,
          responseObj: response
        }
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'An error occurred while querying the civic database. Please try selecting a category directly or check your connection.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const samplePrompts = [
    'Find emergency hospitals nearby',
    'Where can I get purified drinking water in Vijayawada?',
    'Show wheelchair accessible government facilities',
    'List public transit and bus hubs'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div 
        id="ai-assistant-modal"
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50 via-teal-50 to-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Community Resource Assistant
                <span className="text-[10px] font-semibold tracking-wide text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                  GROUNDED AI
                </span>
              </h3>
              <p className="text-xs text-slate-600">Strictly answers from real database records</p>
            </div>
          </div>
          <button
            id="close-ai-assistant"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-xl p-3.5 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-50 border border-slate-200/80 text-slate-800'
                }`}
              >
                <div className="whitespace-pre-line">{msg.content}</div>

                {/* Grounded Matching Assets Cards */}
                {msg.responseObj && msg.responseObj.matchedAssetIds.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200/60 space-y-2">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Matched Verified Database Records:
                    </div>
                    {msg.responseObj.matchedAssetIds.map(assetId => {
                      const found = assets.find(a => a.id === assetId);
                      if (!found) return null;
                      return (
                        <div
                          key={found.id}
                          onClick={() => {
                            onSelectAsset(found);
                            onClose();
                          }}
                          className="bg-white border border-slate-200 rounded-lg p-2.5 hover:border-emerald-500 hover:shadow-xs cursor-pointer flex items-center justify-between gap-2 transition-all"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <CategoryBadge categoryId={found.categoryId} />
                              <span className="text-[10px] text-emerald-700 font-medium">✓ Verified</span>
                            </div>
                            <div className="font-semibold text-slate-900 truncate">{found.name}</div>
                            <div className="text-[11px] text-slate-500 truncate">{found.address}</div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-xl w-fit">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              <span>Searching real database records...</span>
            </div>
          )}
        </div>

        {/* Quick Suggestion Chips */}
        {messages.length < 3 && (
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar">
            <span className="text-slate-400 text-[11px] font-medium shrink-0">Try asking:</span>
            {samplePrompts.map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSend(p)}
                className="shrink-0 bg-white border border-slate-200 hover:border-emerald-400 hover:text-emerald-700 text-slate-700 px-2.5 py-1 rounded-full transition-colors text-[11px]"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3 border-t border-slate-100 bg-white flex items-center gap-2">
          <input
            id="ai-query-input"
            type="text"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about community resources, wheelchair access, hospitals..."
            className="flex-1 text-xs border border-slate-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
          />
          <button
            id="ai-send-btn"
            type="button"
            disabled={!queryInput.trim() || loading}
            onClick={() => handleSend()}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl font-medium text-xs flex items-center gap-1.5 transition-colors"
          >
            <span>Ask</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
