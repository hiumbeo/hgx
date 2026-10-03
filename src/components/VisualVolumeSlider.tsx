import React from 'react';
import {
  Volume2,
  VolumeX,
  Volume1,
  Terminal,
  Zap,
  Sliders,
  Sparkles
} from 'lucide-react';

interface VisualVolumeSliderProps {
  volume: number;
  onVolumeChange: (newVol: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  activeNodeName?: string;
}

export const VisualVolumeSlider: React.FC<VisualVolumeSliderProps> = ({
  volume,
  onVolumeChange,
  isMuted,
  onToggleMute,
  activeNodeName = 'Public-Node-1-US'
}) => {
  const currentEffectiveVolume = isMuted ? 0 : volume;

  // 16-bar visual LED level meter
  const totalBars = 16;
  const activeBarsCount = Math.round((currentEffectiveVolume / 150) * totalBars);

  const presets = [
    { label: 'Tắt tiếng', val: 0, tag: 'Mute' },
    { label: 'Thì thầm', val: 25, tag: '25%' },
    { label: 'Tiêu chuẩn', val: 50, tag: '50%' },
    { label: 'Khuyên dùng', val: 80, tag: '80%' },
    { label: '100% Max', val: 100, tag: '100%' },
    { label: 'Boost Hi-Fi', val: 150, tag: '150%' },
  ];

  return (
    <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/90 space-y-3.5">
      {/* Header bar with Status & Level */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Sliders className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span>Lavalink Hardware Volume Controller</span>
              {currentEffectiveVolume > 100 && (
                <span className="text-[10px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.2 rounded font-mono">
                  BOOST ACTIVE
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400">
              Điều chỉnh biên độ âm thanh trực tiếp trên cụm Lavalink Core
            </div>
          </div>
        </div>

        {/* Tabular Volume Meter Display */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800">
          <span className="text-slate-400 text-xs font-medium">Gain:</span>
          <span
            className={`font-mono text-sm font-bold tabular-nums ${
              currentEffectiveVolume === 0
                ? 'text-slate-500'
                : currentEffectiveVolume > 100
                ? 'text-rose-400'
                : currentEffectiveVolume > 70
                ? 'text-indigo-400'
                : 'text-emerald-400'
            }`}
          >
            {currentEffectiveVolume}%
          </span>
        </div>
      </div>

      {/* Visual LED Equalizer / Level Meter */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <span>0 dB</span>
          <span>50%</span>
          <span>100% Nominal</span>
          <span className="text-rose-400">+6 dB (150%)</span>
        </div>

        <div className="grid grid-cols-16 gap-1 p-2 rounded-lg bg-slate-900/90 border border-slate-800/80">
          {Array.from({ length: totalBars }).map((_, i) => {
            const isActive = i < activeBarsCount;
            // First 10 bars: Green/Emerald. Next 3: Amber. Last 3: Red (Boost zone)
            let activeColor = 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]';
            if (i >= 13) {
              activeColor = 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]';
            } else if (i >= 10) {
              activeColor = 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]';
            }

            return (
              <div
                key={i}
                className="h-5 rounded-sm transition-all duration-150 flex flex-col justify-end overflow-hidden bg-slate-950/80"
              >
                <div
                  className={`w-full transition-all duration-150 ${
                    isActive ? activeColor : 'bg-slate-800/40'
                  }`}
                  style={{ height: isActive ? '100%' : '20%' }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Main Slider & Mute Toggle */}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={onToggleMute}
          className={`p-2 rounded-lg transition-colors cursor-pointer shrink-0 ${
            isMuted || volume === 0
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800'
          }`}
          title={isMuted ? 'Mở âm lượng' : 'Tắt tiếng (Mute)'}
        >
          {isMuted || volume === 0 ? (
            <VolumeX className="w-4 h-4" />
          ) : volume < 50 ? (
            <Volume1 className="w-4 h-4" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </button>

        {/* Range Slider Track */}
        <div className="flex-1 relative flex items-center">
          <input
            type="range"
            min="0"
            max="150"
            step="1"
            value={currentEffectiveVolume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            className="w-full h-2 rounded-lg bg-slate-900 appearance-none cursor-pointer accent-indigo-500 border border-slate-800 focus:outline-none"
          />
        </div>

        <button
          onClick={() => onVolumeChange(100)}
          className="px-2 py-1 text-[11px] font-mono font-semibold rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors cursor-pointer"
          title="Đặt lại mức chuẩn 100%"
        >
          100%
        </button>
      </div>

      {/* Preset Action Buttons */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-[11px] text-slate-500 mr-1 font-medium">Mức đặt nhanh:</span>
        {presets.map((p) => {
          const isSelected = currentEffectiveVolume === p.val && (!isMuted || p.val === 0);
          return (
            <button
              key={p.val}
              onClick={() => onVolumeChange(p.val)}
              className={`px-2.5 py-1 text-xs font-mono rounded-md transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'bg-slate-900 hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-800/80'
              }`}
            >
              {p.tag}
            </button>
          );
        })}
      </div>

      {/* Live Bot Command Interface Telemetry */}
      <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/80 text-[11px] text-slate-400 font-mono space-y-1">
        <div className="flex items-center justify-between text-slate-300">
          <span className="flex items-center gap-1.5 font-semibold text-indigo-400">
            <Terminal className="w-3.5 h-3.5" />
            <span>Bot Command Interface:</span>
          </span>
          <span className="text-[10px] text-emerald-400 flex items-center gap-1">
            <Zap className="w-3 h-3" />
            <span>Synchronized</span>
          </span>
        </div>
        <div className="text-slate-300">
          <strong className="text-white">/volume</strong> percent: <span className="text-emerald-400 font-bold">{currentEffectiveVolume}</span>
        </div>
        <div className="text-[10px] text-slate-500 truncate">
          &gt; Shoukaku.Player.setGlobalVolume({currentEffectiveVolume}) ➔ Dispatched to Node: {activeNodeName}
        </div>
      </div>
    </div>
  );
};
