import React from 'react';
import {
  ShieldAlert,
  Radio,
  Zap,
  Lock,
  Music2,
  FileCode,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { AntiRaidThresholds, AntiSpamSettings } from '../types';

interface DashboardOverviewProps {
  antiRaidConfig: AntiRaidThresholds;
  antiSpamConfig: AntiSpamSettings;
  setActiveTab: (tab: string) => void;
  onEmergencyLockdown: () => void;
  isLockdownActive: boolean;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  antiRaidConfig,
  antiSpamConfig,
  setActiveTab,
  onEmergencyLockdown,
  isLockdownActive
}) => {
  return (
    <div className="space-y-6">
      {/* Hero Banner / Status Overview */}
      <div className="p-6 rounded-xl bg-slate-900/70 border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-white">
              AegisCore Security &amp; Lavalink Audio Engine
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl">
              Hệ thống bảo vệ Discord toàn diện: Anti-Raid Nuke, phân biệt người gõ nhanh vs bot spam thông minh, cùng bộ phát nhạc Lavalink v4 không spam tin nhắn.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onEmergencyLockdown}
              className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors cursor-pointer ${
                isLockdownActive
                  ? 'bg-rose-600 text-white hover:bg-rose-500'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isLockdownActive ? 'Hủy phong tỏa (Unlock)' : 'Khóa khẩn cấp (Lockdown)'}</span>
            </button>
            <button
              onClick={() => setActiveTab('export')}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Xem Code Bot</span>
            </button>
          </div>
        </div>
      </div>

      {/* Core Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Anti-Nuke Protection</span>
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-white font-mono tabular-nums">
            {antiRaidConfig.maxChannelDeletes} <span className="text-xs font-normal text-slate-500">kênh / {antiRaidConfig.timeWindowSeconds}s</span>
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <span>Tự động tước quyền Admin &amp; Cách ly</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Lavalink Audio Nodes</span>
            <Radio className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-white font-mono tabular-nums">
            4 / 4 <span className="text-xs font-normal text-slate-500">Public Nodes</span>
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <span>Tự động failover khi mất kết nối</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Smart Anti-Spam</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-white font-mono tabular-nums">
            {antiSpamConfig.similarityThresholdPercent}% <span className="text-xs font-normal text-slate-500">Độ tương đồng</span>
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <span>Phân biệt gõ nhanh vs bot flood</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Anti-Chat Spam Loop</span>
            <RefreshCw className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-white font-mono tabular-nums">
            1 Embed <span className="text-xs font-normal text-slate-500">Controller</span>
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <span>Chỉnh sửa tin nhắn, không spam chat</span>
          </div>
        </div>
      </div>

      {/* Feature Navigation Modules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Anti-Raid / Nuke Module */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col justify-between space-y-4">
          <div className="space-y-2.5">
            <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <h2 className="text-base font-semibold text-white">Anti-Raid &amp; Anti-Nuke Engine</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Thuật toán cửa sổ trượt (Sliding Window) giám sát Audit Log theo thời gian thực. Chặn đứng admin bị lộ token xóa kênh, xóa vai trò, ban hàng loạt hoặc thêm bot lạ vào server.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('antiraid')}
            className="flex items-center gap-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors pt-2 border-t border-slate-800/80 cursor-pointer"
          >
            <span>Mở Console Anti-Raid</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Smart Anti-Spam Module */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col justify-between space-y-4">
          <div className="space-y-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Zap className="w-4 h-4" />
            </div>
            <h2 className="text-base font-semibold text-white">Smart Anti-Spam Heuristics</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Giải quyết triệt để lỗi phạt oan người gõ nhanh: Phân tích khoảng thời gian gõ (WPM), độ đa dạng ký tự (Entropy) và khoảng cách Levenshtein để chỉ trừng phạt spam sao chép và macro.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('antispam')}
            className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors pt-2 border-t border-slate-800/80 cursor-pointer"
          >
            <span>Thử nghiệm bộ phân tích</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Lavalink Music Module */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col justify-between space-y-4">
          <div className="space-y-2.5">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Music2 className="w-4 h-4" />
            </div>
            <h2 className="text-base font-semibold text-white">Lavalink Audio &amp; No-Spam Controller</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Bộ phát nhạc Hi-Fi hỗ trợ YouTube, SoundCloud, direct MP3 stream. Chế độ lặp lại linh hoạt (Off, Single Track, Queue Loop), kèm nút bấm Discord tương tác không spam tin nhắn.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('music')}
            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors pt-2 border-t border-slate-800/80 cursor-pointer"
          >
            <span>Mở Trình phát nhạc</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Architecture Highlights */}
      <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-4">
        <h3 className="text-sm font-semibold text-slate-200">
          Quy chuẩn kỹ thuật loại bỏ 100% lỗi runtime trong Bot
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs text-slate-400">
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="font-semibold text-slate-200">Bảo vệ phân cấp vai trò (Role Hierarchy)</span>
            <p>Bot kiểm tra `member.manageable` và quyền chủ sở hữu trước khi thực hiện cách ly, triệt tiêu mã lỗi Discord API 50013.</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="font-semibold text-slate-200">Khôi phục kênh tức thời (Auto-Snapshot)</span>
            <p>Lưu cache metadata (tên, danh mục, quyền hạn) của kênh để tạo lại ngay khi bị nuke trái phép.</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="font-semibold text-slate-200">Chống lặp tin nhắn Controller</span>
            <p>Duy nhất 1 tin nhắn nhúng chứa nút tương tác. Mọi thao tác Skip, Pause, Loop chỉ cập nhật message cũ qua `edit()`.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
