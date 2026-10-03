import React, { useState } from 'react';
import {
  ShieldAlert,
  Play,
  RotateCcw,
  CheckCircle2,
  Trash2,
  UserX,
  Bot,
  Hash,
  Volume2
} from 'lucide-react';
import { AntiRaidThresholds, AntiRaidIncident } from '../types';

interface AntiRaidConsoleProps {
  config: AntiRaidThresholds;
}

interface SimulatedChannel {
  id: string;
  name: string;
  type: 'text' | 'voice';
  category: string;
}

export const AntiRaidConsole: React.FC<AntiRaidConsoleProps> = ({ config }) => {
  const initialChannels: SimulatedChannel[] = [
    { id: 'ch-1', name: 'thông-báo-chung', type: 'text', category: 'Kênh Thông Tin' },
    { id: 'ch-2', name: 'trò-chuyện-chính', type: 'text', category: 'Cộng Đồng' },
    { id: 'ch-3', name: 'lệnh-bot-nhạc', type: 'text', category: 'Tiện Ích' },
    { id: 'ch-4', name: 'phòng-voice-1', type: 'voice', category: 'Phòng Thoại' },
    { id: 'ch-5', name: 'phòng-chill-nhạc', type: 'voice', category: 'Phòng Thoại' }
  ];

  const [channels, setChannels] = useState<SimulatedChannel[]>(initialChannels);
  const [incidents, setIncidents] = useState<AntiRaidIncident[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>('Hệ thống Aegis Shield đang bảo vệ thụ động');
  const [slidingWindowCount, setSlidingWindowCount] = useState<number>(0);

  const resetSimulation = () => {
    setChannels(initialChannels);
    setIncidents([]);
    setSlidingWindowCount(0);
    setCurrentStatus('Đã thiết lập lại trạng thái server ban đầu.');
  };

  const simulateChannelNuke = async () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setCurrentStatus('⚠️ Phát hiện Admin độc hại bắt đầu xóa kênh...');

    // Delete 1st channel
    setChannels((prev) => prev.filter((c) => c.id !== 'ch-3'));
    setSlidingWindowCount(1);
    await new Promise((r) => setTimeout(r, 600));

    // Delete 2nd channel (Reaches threshold of 2)
    setChannels((prev) => prev.filter((c) => c.id !== 'ch-2'));
    setSlidingWindowCount(2);
    await new Promise((r) => setTimeout(r, 600));

    // Anti-Raid triggers!
    setCurrentStatus('🚨 NGƯỠNG ANTI-NUKE KÍCH HOẠT! Đang tước quyền Admin và cách ly kẻ tấn công...');
    await new Promise((r) => setTimeout(r, 800));

    const newIncident: AntiRaidIncident = {
      id: `inc-${Date.now()}`,
      timestamp: Date.now(),
      actor: {
        id: 'user_rogue_99',
        name: 'RogueMod#1337',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
        isBot: false,
      },
      actionType: 'CHANNEL_DELETE',
      count: 2,
      threshold: config.maxChannelDeletes,
      status: 'reverted',
      details: 'Tước quyền Administrator, gán vai trò Aegis-Quarantine, phục hồi lại 2 kênh từ Snapshot cache.',
    };

    setIncidents((prev) => [newIncident, ...prev]);

    // Restore channels automatically from snapshot
    if (config.autoRestoreChannels) {
      await new Promise((r) => setTimeout(r, 700));
      setChannels(initialChannels);
      setCurrentStatus('🛡️ Đã ngăn chặn thành công: Kẻ tấn công bị cách ly + Đã tự động khôi phục lại các kênh bị xóa!');
    }

    setIsSimulating(false);
    setSlidingWindowCount(0);
  };

  const simulateMassBan = async () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setCurrentStatus('⚠️ Phát hiện lệnh Ban gửi liên tục từ tài khoản bị hack...');

    for (let i = 1; i <= config.maxBans; i++) {
      setSlidingWindowCount(i);
      await new Promise((r) => setTimeout(r, 400));
    }

    setCurrentStatus('🚨 Vượt quá giới hạn Ban cho phép! Tiến hành phong tỏa khẩn cấp...');
    await new Promise((r) => setTimeout(r, 700));

    const newIncident: AntiRaidIncident = {
      id: `inc-${Date.now()}`,
      timestamp: Date.now(),
      actor: {
        id: 'bot_malicious_01',
        name: 'CompromisedStaff#0001',
        avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=120&q=80',
        isBot: true,
      },
      actionType: 'MASS_BAN',
      count: config.maxBans,
      threshold: config.maxBans,
      status: 'quarantined',
      details: `Ban ${config.maxBans} thành viên trong ${config.timeWindowSeconds}s. Đã thu hồi toàn bộ quyền Moderation & Timeout 24h.`,
    };

    setIncidents((prev) => [newIncident, ...prev]);
    setCurrentStatus('🛡️ Đã cách ly tài khoản Staff bị lộ token, bảo vệ 100% thành viên còn lại.');
    setIsSimulating(false);
    setSlidingWindowCount(0);
  };

  const simulateRogueBotAdd = async () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setCurrentStatus('⚠️ Một thành viên không có trong Whitelist vừa mời Bot lạ vào server...');
    await new Promise((r) => setTimeout(r, 600));

    const newIncident: AntiRaidIncident = {
      id: `inc-${Date.now()}`,
      timestamp: Date.now(),
      actor: {
        id: 'bot_unauth_88',
        name: 'SpamRaidBot#9999',
        avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&q=80',
        isBot: true,
      },
      actionType: 'BOT_ADD_ATTEMPT',
      count: 1,
      threshold: 1,
      status: 'intercepted',
      details: 'Bot lạ chưa được Chủ server Whitelist. Đã tự động Kick bot ra khỏi server và gửi cảnh báo đến kênh audit log.',
    };

    setIncidents((prev) => [newIncident, ...prev]);
    setCurrentStatus('🛡️ Đã đá Bot lạ khỏi server ngay tại cổng kết nối GuildMemberAdd.');
    setIsSimulating(false);
  };

  return (
    <div className="space-y-6">
      {/* Header and status display */}
      <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Console Giả Lập Anti-Raid &amp; Anti-Nuke</h2>
              <div className="text-xs text-slate-400">
                Thử nghiệm cơ chế phát hiện phá hoại bằng Sliding Window &amp; Khôi phục tự động
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={resetSimulation}
              disabled={isSimulating}
              className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Khôi phục mẫu</span>
            </button>
          </div>
        </div>

        {/* Dynamic Status Bar */}
        <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-300 font-medium">{currentStatus}</span>
          </div>
          <div className="text-slate-400 font-mono tabular-nums">
            Cửa sổ trượt: <span className="text-white font-semibold">{slidingWindowCount}</span> / {config.maxChannelDeletes} hành động
          </div>
        </div>
      </div>

      {/* Simulator Attack Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button
          onClick={simulateChannelNuke}
          disabled={isSimulating}
          className="p-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 hover:border-rose-500/40 transition-all text-left flex items-start gap-3 cursor-pointer disabled:opacity-50"
        >
          <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 shrink-0">
            <Trash2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white">Giả lập Mass Delete Kênh</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Xóa 2 kênh liên tục trong {config.timeWindowSeconds}s. Xem bot cách ly &amp; khôi phục tức thời.
            </div>
          </div>
        </button>

        <button
          onClick={simulateMassBan}
          disabled={isSimulating}
          className="p-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/40 transition-all text-left flex items-start gap-3 cursor-pointer disabled:opacity-50"
        >
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
            <UserX className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white">Giả lập Mass Ban Thành Viên</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Admin bị hack token gửi {config.maxBans} lệnh ban liên tiếp. Kích hoạt tước quyền khẩn cấp.
            </div>
          </div>
        </button>

        <button
          onClick={simulateRogueBotAdd}
          disabled={isSimulating}
          className="p-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/40 transition-all text-left flex items-start gap-3 cursor-pointer disabled:opacity-50"
        >
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white">Giả lập Thêm Bot Lạ Trái Phép</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Thành viên không được Whitelist thêm bot mới. Bot tự động bị kick ra ngoài.
            </div>
          </div>
        </button>
      </div>

      {/* Server Structure & Incident Logs split view */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Server Channels Mock State */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">
              Cấu trúc Kênh Server (Live Snapshot)
            </h3>
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              {channels.length} kênh hoạt động
            </span>
          </div>

          <div className="space-y-2">
            {channels.map((ch) => (
              <div
                key={ch.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-950/60 border border-slate-800/70 text-xs"
              >
                <div className="flex items-center gap-2 text-slate-300">
                  {ch.type === 'text' ? (
                    <Hash className="w-3.5 h-3.5 text-slate-500" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                  )}
                  <span className="font-mono text-slate-200">{ch.name}</span>
                </div>
                <span className="text-[11px] text-slate-500">{ch.category}</span>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
            <strong className="text-slate-300">Cơ chế Snapshot Cache:</strong> Mỗi khi một kênh được tạo hoặc sửa đổi, AegisCore lưu vị trí, danh mục và toàn bộ phân quyền Overwrites vào RAM. Khi phát hiện Nuke, bot gọi <code className="text-indigo-300 font-mono">guild.channels.create()</code> để khôi phục y nguyên chỉ trong vài mili-giây.
          </div>
        </div>

        {/* Right: Security Incident Stream */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">
              Nhật ký Can thiệp Bảo mật (Audit Actions)
            </h3>
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              {incidents.length} sự cố
            </span>
          </div>

          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {incidents.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                Chưa có sự cố bảo mật nào. Nhấn các nút giả lập ở trên để thử nghiệm tính năng chống phá hoại.
              </div>
            ) : (
              incidents.map((inc) => (
                <div
                  key={inc.id}
                  className="p-3.5 rounded-lg bg-slate-950/70 border border-rose-500/20 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img
                        src={inc.actor.avatar}
                        alt={inc.actor.name}
                        className="w-5 h-5 rounded-full object-cover"
                      />
                      <span className="text-xs font-semibold text-white">{inc.actor.name}</span>
                    </div>
                    <span className="text-[11px] text-rose-400 font-mono font-medium">
                      {inc.actionType}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-normal">{inc.details}</p>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800/80">
                    <span>{new Date(inc.timestamp).toLocaleTimeString()}</span>
                    <span className="text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Đã xử lý an toàn
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
