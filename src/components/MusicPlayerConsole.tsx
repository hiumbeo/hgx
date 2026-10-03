import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Plus,
  Trash2,
  Radio,
  ExternalLink,
  Disc3,
  ListMusic,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { MusicTrack, LoopMode, LavalinkNode } from '../types';
import { DEFAULT_PUBLIC_NODES } from '../data/publicNodes';
import { INITIAL_TRACKS } from '../data/defaultConfig';
import { audioPlayer } from '../utils/audioSimulator';
import { VisualVolumeSlider } from './VisualVolumeSlider';

export const MusicPlayerConsole: React.FC = () => {
  const [nodes, setNodes] = useState<LavalinkNode[]>(DEFAULT_PUBLIC_NODES);
  const [activeNodeIndex, setActiveNodeIndex] = useState(0);

  const [queue, setQueue] = useState<MusicTrack[]>(INITIAL_TRACKS);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(24);
  const [loopMode, setLoopMode] = useState<LoopMode>('off');
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);

  // Search input state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState<'youtube' | 'soundcloud' | 'mp3'>('youtube');
  const [notification, setNotification] = useState<string | null>(null);

  const currentTrack = queue[currentTrackIndex] || null;

  // Audio timer simulation
  useEffect(() => {
    let interval: any;
    if (isPlaying && currentTrack) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= currentTrack.duration) {
            handleTrackFinish();
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentTrack, currentTrackIndex, loopMode]);

  const handleTrackFinish = () => {
    if (loopMode === 'track') {
      setCurrentTime(0);
      return;
    }

    if (loopMode === 'queue') {
      setCurrentTrackIndex((prev) => (prev + 1) % queue.length);
      setCurrentTime(0);
      return;
    }

    // Normal mode: next or stop
    if (currentTrackIndex < queue.length - 1) {
      setCurrentTrackIndex((prev) => prev + 1);
      setCurrentTime(0);
    } else {
      setIsPlaying(false);
      audioPlayer.stop();
      showToast('Đã phát xong toàn bộ hàng chờ.');
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      audioPlayer.stop();
    } else {
      setIsPlaying(true);
      audioPlayer.play(volume);
    }
  };

  const handleSkip = () => {
    audioPlayer.playCueSound('skip');
    if (loopMode === 'track') {
      setCurrentTime(0);
      return;
    }

    if (currentTrackIndex < queue.length - 1) {
      setCurrentTrackIndex((prev) => prev + 1);
      setCurrentTime(0);
    } else if (loopMode === 'queue' && queue.length > 0) {
      setCurrentTrackIndex(0);
      setCurrentTime(0);
    } else {
      setIsPlaying(false);
      audioPlayer.stop();
    }
  };

  const handlePrevious = () => {
    audioPlayer.playCueSound('skip');
    if (currentTime > 4) {
      setCurrentTime(0);
    } else if (currentTrackIndex > 0) {
      setCurrentTrackIndex((prev) => prev - 1);
      setCurrentTime(0);
    }
  };

  const toggleLoopMode = () => {
    const nextMode: LoopMode = loopMode === 'off' ? 'track' : loopMode === 'track' ? 'queue' : 'off';
    setLoopMode(nextMode);
    const label = nextMode === 'track' ? 'Lặp 1 bài (Track)' : nextMode === 'queue' ? 'Lặp toàn hàng chờ (Queue)' : 'Tắt lặp (Off)';
    showToast(`Đã đổi chế độ: ${label}`);
  };

  const handleVolumeDirectChange = (val: number) => {
    const clamped = Math.max(0, Math.min(150, val));
    setVolume(clamped);
    audioPlayer.setVolume(clamped);
    if (isMuted && clamped > 0) setIsMuted(false);
    showToast(`🔊 /volume percent: ${clamped} -> Đã chỉnh âm lượng Lavalink sang ${clamped}%`);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleVolumeDirectChange(Number(e.target.value));
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      audioPlayer.setVolume(volume);
      showToast(`🔊 /volume percent: ${volume} -> Mở lại âm lượng Lavalink (${volume}%)`);
    } else {
      setIsMuted(true);
      audioPlayer.setVolume(0);
      showToast(`🔇 /volume percent: 0 -> Đã tắt tiếng Lavalink`);
    }
  };

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAddTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    let source = selectedSource;
    let title = searchQuery;
    let author = 'Lavalink Source';
    let duration = 210;

    // Detect URL formats
    if (searchQuery.includes('youtube.com') || searchQuery.includes('youtu.be')) {
      source = 'youtube';
      title = searchQuery.includes('watch') ? 'YouTube Audio Stream' : searchQuery;
      author = 'YouTube HQ';
    } else if (searchQuery.includes('soundcloud.com')) {
      source = 'soundcloud';
      title = 'SoundCloud Master Stream';
      author = 'SoundCloud Artist';
    } else if (searchQuery.endsWith('.mp3') || searchQuery.endsWith('.ogg') || searchQuery.includes('/audio')) {
      source = 'mp3';
      title = 'Direct HTTP/MP3 Audio Stream';
      author = 'Direct Link';
      duration = 180;
    }

    const newTrack: MusicTrack = {
      id: `track-${Date.now()}`,
      title,
      author,
      duration,
      uri: searchQuery.startsWith('http') ? searchQuery : `https://youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`,
      thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=400&q=80',
      source,
      requester: {
        id: 'usr_admin',
        username: 'He_Owner',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
      }
    };

    setQueue((prev) => [...prev, newTrack]);
    setSearchQuery('');
    showToast(`Đã thêm vào hàng chờ: ${title}`);
  };

  const removeTrack = (index: number) => {
    if (queue.length <= 1) {
      showToast('Phải giữ lại ít nhất 1 bài trong hàng chờ.');
      return;
    }
    setQueue((prev) => prev.filter((_, i) => i !== index));
    if (index === currentTrackIndex) {
      setCurrentTime(0);
    } else if (index < currentTrackIndex) {
      setCurrentTrackIndex((prev) => prev - 1);
    }
  };

  const formatSecs = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  const activeNode = nodes[activeNodeIndex];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-16 right-6 z-50 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg shadow-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header with Node Cluster Summary */}
      <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Disc3 className="w-4 h-4 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Lavalink Audio Engine &amp; Controller</h2>
              <p className="text-xs text-slate-400">
                Phát nhạc YouTube, SoundCloud, MP3 link trực tiếp với Public Node và cơ chế chống spam tin nhắn.
              </p>
            </div>
          </div>

          {/* Active Node Status pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs">
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-300 font-medium">{activeNode.name}</span>
            <span className="text-slate-500">·</span>
            <span className="text-emerald-400 font-mono tabular-nums">{activeNode.ping}ms</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Player Controller & Discord Single-Embed Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Player & Active Track (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Now Playing Interactive Deck */}
          <div className="p-6 rounded-xl bg-slate-900/70 border border-slate-800 space-y-5">
            {currentTrack ? (
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-slate-800 shrink-0 border border-slate-700">
                    <img
                      src={currentTrack.thumbnail}
                      alt={currentTrack.title}
                      className="w-full h-full object-cover"
                    />
                    {isPlaying && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <div className="flex items-end gap-1 h-4">
                          <span className="w-1 bg-indigo-400 rounded-full animate-pulse h-4"></span>
                          <span className="w-1 bg-indigo-400 rounded-full animate-pulse h-2.5"></span>
                          <span className="w-1 bg-indigo-400 rounded-full animate-pulse h-3.5"></span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {currentTrack.source}
                      </span>
                      <span className="text-xs text-slate-400 truncate">
                        Yêu cầu bởi <strong className="text-slate-300">{currentTrack.requester.username}</strong>
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white truncate" title={currentTrack.title}>
                      {currentTrack.title}
                    </h3>
                    <p className="text-xs text-slate-400 truncate">{currentTrack.author}</p>
                  </div>
                </div>

                {/* Scrubber Progress Bar */}
                <div className="space-y-1">
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className="bg-indigo-600 h-full transition-all duration-300"
                      style={{ width: `${(currentTime / (currentTrack.duration || 1)) * 100}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono tabular-nums">
                    <span>{formatSecs(currentTime)}</span>
                    <span>{formatSecs(currentTrack.duration)}</span>
                  </div>
                </div>

                {/* Control Action Buttons */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePrevious}
                      className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                      title="Bài trước đó"
                    >
                      <SkipBack className="w-4 h-4" />
                    </button>

                    <button
                      onClick={togglePlay}
                      className="p-3 text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center"
                    >
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                    </button>

                    <button
                      onClick={handleSkip}
                      className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                      title="Bỏ qua (Skip)"
                    >
                      <SkipForward className="w-4 h-4" />
                    </button>

                    <button
                      onClick={toggleLoopMode}
                      className={`p-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold ${
                        loopMode !== 'off'
                          ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50'
                          : 'text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700'
                      }`}
                      title="Chế độ lặp lại: Off / Track / Queue"
                    >
                      {loopMode === 'track' ? (
                        <>
                          <Repeat1 className="w-4 h-4" />
                          <span className="text-[10px]">Track</span>
                        </>
                      ) : loopMode === 'queue' ? (
                        <>
                          <Repeat className="w-4 h-4" />
                          <span className="text-[10px]">Queue</span>
                        </>
                      ) : (
                        <Repeat className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Volume Quick Slider */}
                  <div className="flex items-center gap-2 text-slate-400">
                    <button onClick={toggleMute} className="hover:text-white transition-colors cursor-pointer">
                      {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="150"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => handleVolumeDirectChange(Number(e.target.value))}
                      className="w-20 sm:w-28 accent-indigo-500 h-1.5 rounded-lg bg-slate-950 cursor-pointer"
                    />
                    <span className="text-[11px] font-mono tabular-nums w-10 text-right text-slate-300">
                      {isMuted ? 0 : volume}%
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500 text-xs">
                Hàng chờ đang trống. Thêm một bài hát bên dưới để bắt đầu phát.
              </div>
            )}
          </div>

          {/* Visual Volume Slider Component with Level Meter & Lavalink Command Dispatch */}
          <VisualVolumeSlider
            volume={volume}
            onVolumeChange={handleVolumeDirectChange}
            isMuted={isMuted}
            onToggleMute={toggleMute}
            activeNodeName={activeNode.name}
          />

          {/* Add Track & Link Resolver */}
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
              <span>Thêm Nhạc (YouTube / SoundCloud / MP3 Direct Link)</span>
              <span className="text-[11px] font-normal text-slate-500">Auto-Detect Source</span>
            </h3>

            <form onSubmit={handleAddTrack} className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Nhập tên bài hát hoặc dán link YouTube, SoundCloud, mp3..."
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedSource}
                  onChange={(e) => setSelectedSource(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="youtube">YouTube</option>
                  <option value="soundcloud">SoundCloud</option>
                  <option value="mp3">Direct MP3</option>
                </select>

                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm</span>
                </button>
              </div>
            </form>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-400">
              <span className="text-slate-500">Mẫu sẵn:</span>
              <button
                type="button"
                onClick={() => setSearchQuery('https://www.youtube.com/watch?v=7wa_Zk684lM')}
                className="hover:text-indigo-400 underline decoration-slate-700"
              >
                YouTube (Pháo)
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => setSearchQuery('https://soundcloud.com/synthhaven/cyber-lofi-night')}
                className="hover:text-indigo-400 underline decoration-slate-700"
              >
                SoundCloud Lofi
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => setSearchQuery('https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg')}
                className="hover:text-indigo-400 underline decoration-slate-700"
              >
                Direct OGG/MP3
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Discord Single Embed UI & Queue List (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Discord Single-Embed Simulator */}
          <div className="p-4 rounded-xl bg-[#313338] border border-slate-700/60 space-y-3 shadow-lg">
            <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="text-white font-semibold">Giao Diện Discord (Không spam chat)</span>
              </div>
              <span className="text-[11px] text-slate-400">Single Embed + Buttons</span>
            </div>

            {/* Embedded Card */}
            <div className="p-4 rounded-lg bg-[#2b2d31] border-l-4 border-indigo-500 text-xs space-y-3 text-slate-200">
              <div className="font-bold text-white text-sm flex items-center gap-2">
                <span>💿 ĐANG PHÁT NHẠC (LAVALINK HI-FI)</span>
              </div>

              {currentTrack ? (
                <div className="space-y-1.5">
                  <div className="font-semibold text-indigo-400 underline cursor-pointer truncate">
                    {currentTrack.title}
                  </div>
                  <div className="text-[11px] text-slate-300">
                    <strong>Tác giả:</strong> {currentTrack.author} · <strong>Thời lượng:</strong> {formatSecs(currentTrack.duration)}
                  </div>
                  <div className="text-[11px] text-slate-300">
                    <strong>Yêu cầu bởi:</strong> @{currentTrack.requester.username} · <strong>Lặp:</strong>{' '}
                    <span className="font-mono">{loopMode.toUpperCase()}</span> · <strong>Âm lượng:</strong> {volume}%
                  </div>
                  <div className="text-[11px] text-slate-400 pt-1">
                    Hàng chờ tiếp theo: <strong>{queue.length - 1} bài</strong>
                  </div>
                </div>
              ) : (
                <div className="text-slate-400">Không có bài hát nào đang phát.</div>
              )}

              {/* Discord Button Components Row 1 */}
              <div className="pt-2 grid grid-cols-4 gap-1.5">
                <button
                  onClick={togglePlay}
                  className={`py-1.5 px-2 rounded text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors ${
                    isPlaying ? 'bg-[#248046] text-white hover:bg-[#1a6334]' : 'bg-[#4e5058] text-white hover:bg-[#6d6f78]'
                  }`}
                >
                  {isPlaying ? '⏸ Tạm dừng' : '▶ Tiếp tục'}
                </button>
                <button
                  onClick={handleSkip}
                  className="py-1.5 px-2 rounded text-[11px] font-semibold bg-[#5865f2] hover:bg-[#4752c4] text-white flex items-center justify-center gap-1"
                >
                  ⏭ Bỏ qua
                </button>
                <button
                  onClick={toggleLoopMode}
                  className={`py-1.5 px-2 rounded text-[11px] font-semibold flex items-center justify-center gap-1 ${
                    loopMode !== 'off' ? 'bg-[#248046] text-white' : 'bg-[#4e5058] text-white hover:bg-[#6d6f78]'
                  }`}
                >
                  🔁 {loopMode.toUpperCase()}
                </button>
                <button
                  onClick={() => {
                    setIsPlaying(false);
                    audioPlayer.stop();
                    showToast('Đã dừng phát nhạc.');
                  }}
                  className="py-1.5 px-2 rounded text-[11px] font-semibold bg-[#da373c] hover:bg-[#a12829] text-white flex items-center justify-center gap-1"
                >
                  ⏹ Dừng
                </button>
              </div>

              {/* Discord Button Components Row 2 */}
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => handleVolumeDirectChange(Math.max(0, volume - 10))}
                  className="py-1.5 px-2 rounded text-[11px] bg-[#4e5058] hover:bg-[#6d6f78] text-white font-medium cursor-pointer"
                >
                  🔉 Giảm Vol
                </button>
                <button
                  onClick={() => handleVolumeDirectChange(Math.min(150, volume + 10))}
                  className="py-1.5 px-2 rounded text-[11px] bg-[#4e5058] hover:bg-[#6d6f78] text-white font-medium cursor-pointer"
                >
                  🔊 Tăng Vol
                </button>
                <button
                  onClick={() => showToast(`Hàng chờ đang có ${queue.length} bài hát.`)}
                  className="py-1.5 px-2 rounded text-[11px] bg-[#4e5058] hover:bg-[#6d6f78] text-white font-medium"
                >
                  📜 Queue ({queue.length})
                </button>
              </div>

              <div className="text-[10px] text-slate-400 pt-1 text-right">
                AegisCore Lavalink v4 · Zero Spam Architecture
              </div>
            </div>
          </div>

          {/* Queue List */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <ListMusic className="w-4 h-4 text-indigo-400" />
                <span>Danh sách chờ ({queue.length} bài)</span>
              </span>
              <button
                onClick={() => {
                  setQueue([queue[currentTrackIndex]]);
                  setCurrentTrackIndex(0);
                  showToast('Đã dọn sạch hàng chờ.');
                }}
                className="text-[11px] text-slate-500 hover:text-rose-400 transition-colors"
              >
                Xóa hàng chờ
              </button>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {queue.map((track, idx) => (
                <div
                  key={track.id}
                  className={`p-2.5 rounded-lg flex items-center justify-between text-xs transition-colors ${
                    idx === currentTrackIndex
                      ? 'bg-indigo-600/20 border border-indigo-500/40 text-white'
                      : 'bg-slate-950/60 border border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono text-slate-500 w-4 text-center">
                      {idx === currentTrackIndex ? '▶' : idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="font-medium truncate max-w-[200px]">{track.title}</div>
                      <div className="text-[10px] text-slate-500">{track.author} · {formatSecs(track.duration)}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => removeTrack(idx)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Xóa bài"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
