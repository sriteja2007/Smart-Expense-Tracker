import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GlassPanel } from '@/components/ui/glass-panel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { useToast } from '@/components/ui/toast';
import { FinancialApi } from '@/lib/financial-api';
import type { CurrencyCode, AiMessage, AiConversation } from '@lumaspend/shared';

interface AiAdvisorProps {
  currency: CurrencyCode;
}

export const AiAdvisor: React.FC<AiAdvisorProps> = ({ currency: _currency }) => {
  const { toast } = useToast();
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastAnalysisMeta, setLastAnalysisMeta] = useState<{
    model: string;
    period: string;
    isAiGenerated: boolean;
    disclaimer: string;
  } | null>(null);

  const quickPrompts = [
    'Where did most of my money go this month?',
    'How does my spending compare with last month?',
    'Which categories are over budget?',
    'Summarize my biggest expenses.',
    'Suggest areas where I could reduce spending.'
  ];

  // Auto-scroll chat to bottom
  const scrollToBottom = () => {
    if (typeof chatBottomRef.current?.scrollIntoView === 'function') {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Load user's conversations
  const loadConversations = useCallback(async () => {
    try {
      const list = await FinancialApi.listAiConversations();
      const safeList = Array.isArray(list) ? list : [];
      setConversations(safeList);
      const firstConv = safeList[0];
      if (firstConv && !currentConversationId) {
        setCurrentConversationId(firstConv.id);
        setMessages(firstConv.messages || []);
      }
    } catch {
      setConversations([]);
    }
  }, [currentConversationId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const handleSelectConversation = async (conv: AiConversation) => {
    setCurrentConversationId(conv.id);
    setMessages(conv.messages || []);
  };

  const handleStartNewSession = async () => {
    try {
      const newConv = await FinancialApi.createAiConversation('Financial Strategy Session');
      setConversations((prev) => [newConv, ...prev]);
      setCurrentConversationId(newConv.id);
      setMessages([]);
      setLastAnalysisMeta(null);
    } catch (err) {
      toast({
        title: 'Error creating session',
        description: err instanceof Error ? err.message : 'Please try again',
        type: 'error'
      });
    }
  };

  const handleSendMessage = async (queryToSend?: string) => {
    const text = (queryToSend || inputQuery).trim();
    if (!text || isLoading) return;

    // Optimistically append user message
    const tempUserMsg: AiMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const response = await FinancialApi.sendAiChat(text, currentConversationId || undefined);

      setCurrentConversationId(response.conversationId);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMsg.id),
        response.userMessage,
        response.aiMessage
      ]);

      setLastAnalysisMeta({
        model: response.model,
        period: response.analysisPeriod,
        isAiGenerated: response.isAiGenerated,
        disclaimer: response.disclaimer
      });

      // Refresh conversations list in background
      loadConversations();
    } catch (err) {
      toast({
        title: 'AI Consultation Failed',
        description: err instanceof Error ? err.message : 'Please check your connection and try again',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[600px]">
      {/* Sidebar: Conversation Sessions & Quick Prompts */}
      <GlassPanel intensity="medium" className="p-5 flex flex-col justify-between space-y-4 lg:col-span-1">
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Icons.AI className="h-5 w-5 text-brand-glow" />
              <h3 className="text-sm font-bold text-white">AI Advisor</h3>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleStartNewSession}
              className="text-xs h-7 px-2 border-white/10"
              title="New Session"
            >
              <Icons.Plus className="h-3 w-3 mr-1" />
              New
            </Button>
          </div>

          {/* Quick Questions Chips */}
          <div>
            <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider block mb-2">
              Suggested Questions
            </span>
            <div className="space-y-1.5">
              {quickPrompts.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleSendMessage(q)}
                  disabled={isLoading}
                  className="w-full text-left text-xs p-2 rounded-xl bg-surface-elevated/60 hover:bg-brand-violet/10 hover:border-brand-violet/30 border border-white/5 text-text-secondary hover:text-white transition-all text-ellipsis overflow-hidden whitespace-nowrap block"
                >
                  💬 {q}
                </button>
              ))}
            </div>
          </div>

          {/* Previous Conversation History */}
          {(conversations || []).length > 0 && (
            <div>
              <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider block mb-2">
                Recent Sessions
              </span>
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {(conversations || []).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectConversation(c)}
                    className={`w-full text-left text-xs p-2 rounded-xl transition-all block truncate ${
                      currentConversationId === c.id
                        ? 'bg-brand-violet/20 text-brand-glow border border-brand-violet/30'
                        : 'text-text-muted hover:text-white hover:bg-surface-elevated/50'
                    }`}
                  >
                    {c.title || 'Strategy Session'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Disclaimer Footer Card */}
        <div className="p-2.5 rounded-xl bg-surface-elevated/40 border border-white/5 text-[10px] text-text-muted leading-relaxed">
          <p className="font-semibold text-white flex items-center gap-1 mb-0.5">
            <Icons.Shield className="h-3 w-3 text-brand-glow" />
            Zero-Trust Data Policy
          </p>
          Responses are grounded exclusively in your verified account summaries. No credentials or raw database records are ever shared.
        </div>
      </GlassPanel>

      {/* Main Chat Stream (3 Columns) */}
      <GlassPanel intensity="medium" className="p-6 flex flex-col justify-between lg:col-span-3 space-y-4">
        {/* Stream Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-white/5">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Financial Intelligence Assistant
              {lastAnalysisMeta && (
                <Badge
                  variant={lastAnalysisMeta.isAiGenerated ? 'violet' : 'neutral'}
                  className="text-[10px]"
                >
                  {lastAnalysisMeta.isAiGenerated ? 'Gemini 3.8 Flash' : 'Rule-Based Engine'}
                </Badge>
              )}
            </h3>
            <p className="text-xs text-text-muted">
              {lastAnalysisMeta?.period
                ? `Analyzing verified financial ledger for Period: ${lastAnalysisMeta.period}`
                : 'Ask questions about spending patterns, envelopes, and cash-flow variance'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="neutral" className="text-[10px]">
              Grounded Analysis
            </Badge>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto space-y-4 max-h-[480px] pr-2">
          {messages.length === 0 ? (
            <div className="h-72 flex flex-col items-center justify-center text-center space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-brand-violet/10 border border-brand-violet/20 flex items-center justify-center text-brand-violet">
                <Icons.AI className="h-6 w-6" />
              </div>
              <div className="max-w-md">
                <h4 className="text-sm font-bold text-white">How can I assist your financial strategy today?</h4>
                <p className="text-xs text-text-muted mt-1">
                  Click a suggested question on the left or type your query below. I will analyze your verified income, expenses, and budget envelopes.
                </p>
              </div>
            </div>
          ) : (
            messages.map((m) => {
              const isUser = m.role === 'user';
              return (
                <div
                  key={m.id}
                  className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="h-7 w-7 rounded-lg bg-brand-violet/20 border border-brand-violet/30 flex items-center justify-center text-brand-glow shrink-0 mt-1">
                      <Icons.Bot className="h-4 w-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed space-y-2 ${
                      isUser
                        ? 'bg-brand-violet text-white shadow-glow-violet'
                        : 'bg-surface-elevated/80 border border-white/10 text-white shadow-glass backdrop-blur-md'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{m.content}</div>
                    <span className="text-[10px] text-white/50 block text-right">
                      {m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>

                  {isUser && (
                    <div className="h-7 w-7 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-white shrink-0 mt-1">
                      <span className="text-[10px] font-bold">You</span>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Loading bubble */}
          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="h-7 w-7 rounded-lg bg-brand-violet/20 border border-brand-violet/30 flex items-center justify-center text-brand-glow shrink-0">
                <Icons.Refresh className="h-4 w-4 animate-spin" />
              </div>
              <div className="bg-surface-elevated/80 border border-white/10 p-3.5 rounded-2xl text-xs text-text-secondary animate-pulse flex items-center gap-2">
                <span>Analyzing ledger metrics and synthesizing insights...</span>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Query Input Bar */}
        <div className="space-y-2 pt-2 border-t border-white/5">
          <div className="flex items-center gap-2 bg-surface-elevated border border-white/10 rounded-2xl p-1.5 focus-within:border-brand-violet/60 transition-all">
            <textarea
              rows={2}
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your spending, categories, or savings pace... (Press Enter to send)"
              disabled={isLoading}
              className="w-full bg-transparent border-0 px-3 py-1 text-xs text-white placeholder-text-muted focus:outline-none resize-none"
            />
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => handleSendMessage()}
              disabled={!inputQuery.trim() || isLoading}
              className="h-9 px-3 rounded-xl shrink-0"
            >
              <Icons.AI className="h-3.5 w-3.5 mr-1" />
              Send
            </Button>
          </div>

          {/* Disclaimer notice */}
          <p className="text-[10px] text-text-muted text-center">
            {lastAnalysisMeta?.disclaimer ||
              'This summary is generated for personal budgeting guidance only and does not constitute certified investment advice.'}
          </p>
        </div>
      </GlassPanel>
    </div>
  );
};
