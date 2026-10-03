import React, { useState, useRef, useEffect } from 'react';
import {
  Zap,
  Send,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldCheck,
  ShieldX
} from 'lucide-react';
import { AntiSpamSettings, SpamAnalysisResult } from '../types';
import { analyzeMessage, UserMessageHistory } from '../utils/antiSpamHeuristics';

interface AntiSpamTesterProps {
  settings: AntiSpamSettings;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  content: string;
  timestamp: number;
  analysis?: SpamAnalysisResult;
  isDeleted?: boolean;
}

export const AntiSpamTester: React.FC<AntiSpamTesterProps> = ({ settings }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'bot',
      content: '👋 Chào mừng bạn đến với Phòng thử nghiệm Smart Anti-Spam của AegisCore! Hãy thử gõ tin nhắn bình thường, gõ thật nhanh, hoặc thử copy-paste spam để xem thuật toán phân tích nhé.',
      timestamp: Date.now() - 10000,
    }
  ]);

  const [inputContent, setInputContent] = useState('');
  const [lastAnalysis, setLastAnalysis] = useState<SpamAnalysisResult | null>(null);
  const userHistoryRef = useRef<UserMessageHistory[]>([]);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (textToSend?: string) => {
    const content = textToSend || inputContent;
    if (!content.trim()) return;

    const analysis = analyzeMessage(content, userHistoryRef.current, settings);
    setLastAnalysis(analysis);

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      sender: 'user',
      content,
      timestamp: Date.now(),
      analysis,
      isDeleted: analysis.isSpam && (analysis.recommendedAction.includes('Xóa') || settings.actionOnSpam === 'delete'),
    };

    userHistoryRef.current.push({
      content,
      timestamp: Date.now(),
    });

    // Keep last 10 messages in memory for history tracking
    if (userHistoryRef.current.length > 10) {
      userHistoryRef.current.shift();
    }

    const newMsgs = [...messages, userMsg];

    // If bot intervenes, add a bot response message
    if (analysis.isSpam || analysis.isFastHumanTyping) {
      setTimeout(() => {
        let botText = '';
        if (analysis.isRaidBurst) {
          botText = `🚨 [HỆ THỐNG TRỪNG PHẠT] Phát hiện: ${analysis.reason}. Biện pháp: ${analysis.recommendedAction}.`;
        } else if (analysis.isSpam) {
          botText = `⚠️ [CẢNH BÁO BẢO VỆ] ${analysis.reason}. ${analysis.recommendedAction}.`;
        } else if (analysis.isFastHumanTyping) {
          botText = `💬 [BỘ LỌC THÔNG MINH] ${analysis.reason}. Nhận diện: Hành vi gõ phím của người thật, hệ thống KHÔNG xử phạt nhầm.`;
        }

        if (botText) {
          setMessages((prev) => [
            ...prev,
            {
              id: `bot-${Date.now()}`,
              sender: 'bot',
              content: botText,
              timestamp: Date.now(),
            }
          ]);
        }
      }, 350);
    }

    setMessages(newMsgs);
    if (!textToSend) setInputContent('');
  };

  // Presets to let user test immediately without manual typing effort
  const testFastHumanTyping = async () => {
    const phrases = [
      'Chào mọi người nhé, hôm nay server có gì vui không',
      'Mình vừa vào phòng voice tính nghe tí nhạc chill',
      'Đang định bật bot nhạc lên nghe đây này',
      'Để gọi bot vào xem thế nào nhé'
    ];

    for (const p of phrases) {
      handleSendMessage(p);
      // Human typing delay (450ms - 650ms)
      await new Promise((r) => setTimeout(r, 520));
    }
  };

  const testDuplicateSpam = async () => {
    const text = 'FREE NITRO DISCORD TẶNG QUÀ LIÊN HỆ NGAY';
    for (let i = 0; i < 4; i++) {
      handleSendMessage(text);
      // Rapid copy-paste interval
      await new Promise((r) => setTimeout(r, 220));
    }
  };

  const testMacroFlood = async () => {
    const texts = ['msg_flood_1', 'msg_flood_2', 'msg_flood_3', 'msg_flood_4', 'msg_flood_5'];
    for (const t of texts) {
      handleSendMessage(t);
      // Ultra fast macro delay (50ms)
      await new Promise((r) => setTimeout(r, 60));
    }
  };

  const testMentionSpam = () => {
    handleSendMessage('Alo mọi người dậy đi nào @everyone @here <@111222333> <@444555666> vào quẩy');
  };

  const testPhishingLink = () => {
    handleSendMessage('Nhận Nitro miễn phí 3 tháng tại https://dlscord.com/free-nitro-airdrop click ngay kẻo hết!');
  };

  const clearChat = () => {
    setMessages([]);
    userHistoryRef.current = [];
    setLastAnalysis(null);
  };

  return (
    <div className="space-y-6">
      {/* Header and description */}
      <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Smart Anti-Spam vs Fast Typing Sandbox</h2>
            <p className="text-xs text-slate-400">
              Cách bot tự động nhận biết: tin nhắn là do người thật gõ phím nhanh hay do bot spam/copy-paste raid.
            </p>
          </div>
        </div>
      </div>

      {/* Preset Action Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-400 font-medium mr-1">Thử nghiệm mẫu:</span>
        <button
          onClick={testFastHumanTyping}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Người gõ nhanh tự nhiên (~140 WPM)</span>
        </button>

        <button
          onClick={testDuplicateSpam}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Spam lặp lại cùng nội dung (Duplicate)</span>
        </button>

        <button
          onClick={testMacroFlood}
          disabled={false}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Macro / Tool Flood (&lt; 100ms)</span>
        </button>

        <button
          onClick={testMentionSpam}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 transition-colors cursor-pointer"
        >
          <span>Tag vô tội vạ (@everyone)</span>
        </button>

        <button
          onClick={testPhishingLink}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 transition-colors cursor-pointer"
        >
          <span>Link Phishing Nitro giả mạo</span>
        </button>

        <button
          onClick={clearChat}
          className="ml-auto px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Xóa chat</span>
        </button>
      </div>

      {/* Main Sandbox Grid: Chat Simulator & Real-time Analysis Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Chat Feed Column (2 cols on lg) */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col h-[520px]">
          <div className="text-xs font-semibold text-slate-300 pb-3 border-b border-slate-800 flex items-center justify-between">
            <span>Kênh Chat Thử Nghiệm (#test-antispam)</span>
            <span className="text-[11px] text-slate-500">Live Heuristic Feedback</span>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto space-y-3 py-4 pr-1">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-1 px-1">
                  <span>{msg.sender === 'user' ? 'Bạn (Tester)' : 'AegisCore Bot (Shield)'}</span>
                  <span>·</span>
                  <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                </div>

                <div
                  className={`p-3 rounded-xl max-w-[85%] text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? msg.isDeleted
                        ? 'bg-rose-950/40 text-rose-300 border border-rose-800/60 line-through opacity-80'
                        : 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-950/80 text-slate-200 border border-slate-800'
                  }`}
                >
                  {msg.content}
                  {msg.isDeleted && (
                    <div className="text-[10px] text-rose-400 no-underline font-semibold mt-1">
                      [ĐÃ BỊ BOT XÓA TỰ ĐỘNG - VI PHẠM SPAM]
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>

          {/* Chat Input */}
          <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
            <input
              type="text"
              value={inputContent}
              onChange={(e) => setInputContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage();
              }}
              placeholder="Nhập thử tin nhắn bất kỳ hoặc thử gõ thật nhanh..."
              className="flex-1 bg-slate-950/80 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={() => handleSendMessage()}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Real-time Heuristic Breakdown (1 col on lg) */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center justify-between">
              <span>Phân Tích Thuật Toán</span>
              <span className="text-[11px] text-indigo-400 font-mono">Live Engine</span>
            </h3>

            {lastAnalysis ? (
              <div className="space-y-3">
                {/* Result Status Box */}
                <div
                  className={`p-3.5 rounded-lg border text-xs space-y-1.5 ${
                    lastAnalysis.isSpam
                      ? 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                      : lastAnalysis.isFastHumanTyping
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold text-xs">
                    {lastAnalysis.isSpam ? (
                      <ShieldX className="w-4 h-4 text-rose-400" />
                    ) : (
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    )}
                    <span>{lastAnalysis.isSpam ? 'KẾT LUẬN: SPAM / ATTACK' : 'KẾT LUẬN: HỢP LỆ (SAFE)'}</span>
                  </div>
                  <div className="text-[11px] leading-relaxed">
                    {lastAnalysis.reason}
                  </div>
                </div>

                {/* Metric Telemetry */}
                <div className="space-y-2 pt-2 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Độ trùng lặp Levenshtein:</span>
                    <span className="font-mono font-semibold text-white tabular-nums">
                      {lastAnalysis.similarityScore}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400">
                    <span>Tốc độ ước tính:</span>
                    <span className="font-mono font-semibold text-white tabular-nums">
                      ~{lastAnalysis.typingSpeedWpm} WPM
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400">
                    <span>Khoảng cách giữa các tin nhắn:</span>
                    <span className="font-mono font-semibold text-white tabular-nums">
                      {lastAnalysis.metrics.burstRateMs} ms
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400">
                    <span>Độ đa dạng ký tự (Entropy):</span>
                    <span className="font-mono font-semibold text-white tabular-nums">
                      {lastAnalysis.metrics.charEntropy} bits
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400">
                    <span>Số lượng @Mentions:</span>
                    <span className="font-mono font-semibold text-white tabular-nums">
                      {lastAnalysis.mentionCount}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-slate-500 text-xs">
                Chưa có dữ liệu. Hãy nhập tin nhắn vào khung chat bên cạnh hoặc nhấn một trong các nút thử nghiệm để xem chỉ số kỹ thuật.
              </div>
            )}
          </div>

          {/* Logic explanation box */}
          <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800 text-[11px] text-slate-400 leading-normal space-y-1">
            <span className="font-semibold text-slate-300">Nguyên lý cốt lõi:</span>
            <p>
              Người gõ nhanh tự nhiên luôn có độ trễ giữa các từ &gt; 350ms, nội dung câu mang tính hội thoại và độ trùng lặp &lt; 40%. Macro bot gửi các chuỗi giống hệt nhau với tốc độ siêu thanh (&lt; 150ms). Thuật toán Aegis phân tách chính xác hai trạng thái này.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
