import React, { useState } from 'react';
import {
  Settings,
  Shield,
  Zap,
  Users,
  Radio,
  Save,
  CheckCircle2,
  Plus,
  Trash2
} from 'lucide-react';
import { AntiRaidThresholds, AntiSpamSettings, ServerWhitelist, LavalinkNode } from '../types';
import { DEFAULT_PUBLIC_NODES } from '../data/publicNodes';

interface ConfigEditorProps {
  antiRaidConfig: AntiRaidThresholds;
  setAntiRaidConfig: React.Dispatch<React.SetStateAction<AntiRaidThresholds>>;
  antiSpamConfig: AntiSpamSettings;
  setAntiSpamConfig: React.Dispatch<React.SetStateAction<AntiSpamSettings>>;
  whitelist: ServerWhitelist;
  setWhitelist: React.Dispatch<React.SetStateAction<ServerWhitelist>>;
}

export const ConfigEditor: React.FC<ConfigEditorProps> = ({
  antiRaidConfig,
  setAntiRaidConfig,
  antiSpamConfig,
  setAntiSpamConfig,
  whitelist,
  setWhitelist,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'antiraid' | 'antispam' | 'whitelist' | 'lavalink'>('antiraid');
  const [savedToast, setSavedToast] = useState(false);

  const [nodes, setNodes] = useState<LavalinkNode[]>(DEFAULT_PUBLIC_NODES);
  const [newNodeHost, setNewNodeHost] = useState('');
  const [newNodePort, setNewNodePort] = useState(443);
  const [newNodePass, setNewNodePass] = useState('youshallnotpass');
  const [newNodeName, setNewNodeName] = useState('');

  const [newAdminId, setNewAdminId] = useState('');

  const handleSave = () => {
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  };

  const addAdminToWhitelist = () => {
    if (!newAdminId.trim()) return;
    if (whitelist.trustedAdminIds.includes(newAdminId.trim())) return;
    setWhitelist({
      ...whitelist,
      trustedAdminIds: [...whitelist.trustedAdminIds, newAdminId.trim()]
    });
    setNewAdminId('');
    handleSave();
  };

  const removeAdminFromWhitelist = (id: string) => {
    setWhitelist({
      ...whitelist,
      trustedAdminIds: whitelist.trustedAdminIds.filter((item) => item !== id)
    });
    handleSave();
  };

  const handleAddNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNodeHost.trim()) return;

    const node: LavalinkNode = {
      name: newNodeName.trim() || `Custom Node ${nodes.length + 1}`,
      host: newNodeHost.trim(),
      port: Number(newNodePort) || 443,
      password: newNodePass.trim(),
      secure: true,
      status: 'connected',
      ping: Math.floor(Math.random() * 30 + 15),
      region: 'Custom Cluster',
      memoryUsage: '350 MB / 2048 MB',
      activePlayers: 0
    };

    setNodes([...nodes, node]);
    setNewNodeHost('');
    setNewNodeName('');
    handleSave();
  };

  const removeNode = (index: number) => {
    setNodes(nodes.filter((_, i) => i !== index));
    handleSave();
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {savedToast && (
        <div className="fixed top-16 right-6 z-50 px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg shadow-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Đã lưu toàn bộ cấu hình thành công!</span>
        </div>
      )}

      {/* Header */}
      <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Bảng Quản Lý Tham Số Cấu Hình Server</h2>
              <p className="text-xs text-slate-400">
                Hiệu chỉnh độ nhạy Anti-Raid, bộ lọc Anti-Spam, danh sách Whitelist và Public Lavalink Nodes.
              </p>
            </div>
          </div>

          <button
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Lưu thay đổi</span>
          </button>
        </div>

        {/* Sub Navigation */}
        <div className="flex items-center gap-2 border-t border-slate-800 pt-3">
          <button
            onClick={() => setActiveSubTab('antiraid')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'antiraid'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Anti-Raid / Nuke</span>
          </button>

          <button
            onClick={() => setActiveSubTab('antispam')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'antispam'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Smart Anti-Spam</span>
          </button>

          <button
            onClick={() => setActiveSubTab('whitelist')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'whitelist'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Whitelist Admin</span>
          </button>

          <button
            onClick={() => setActiveSubTab('lavalink')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'lavalink'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Lavalink Nodes</span>
          </button>
        </div>
      </div>

      {/* SubTab Contents */}
      {activeSubTab === 'antiraid' && (
        <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-6">
          <h3 className="text-sm font-semibold text-white">Ngưỡng giới hạn Anti-Nuke (Cửa sổ trượt)</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-medium">Thời gian cửa sổ trượt (Giây):</label>
              <input
                type="number"
                value={antiRaidConfig.timeWindowSeconds}
                onChange={(e) => setAntiRaidConfig({ ...antiRaidConfig, timeWindowSeconds: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              />
              <span className="text-[11px] text-slate-500">Khoảng thời gian tính tổng số hành động nguy hiểm.</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-medium">Số kênh bị xóa tối đa:</label>
              <input
                type="number"
                value={antiRaidConfig.maxChannelDeletes}
                onChange={(e) => setAntiRaidConfig({ ...antiRaidConfig, maxChannelDeletes: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              />
              <span className="text-[11px] text-slate-500">Vượt qua ngưỡng này sẽ lập tức kích hoạt tước quyền.</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-medium">Số vai trò (Role) bị xóa tối đa:</label>
              <input
                type="number"
                value={antiRaidConfig.maxRoleDeletes}
                onChange={(e) => setAntiRaidConfig({ ...antiRaidConfig, maxRoleDeletes: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              />
              <span className="text-[11px] text-slate-500">Giới hạn xóa Role trước khi bị phong tỏa.</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-medium">Số lệnh Ban tối đa:</label>
              <input
                type="number"
                value={antiRaidConfig.maxBans}
                onChange={(e) => setAntiRaidConfig({ ...antiRaidConfig, maxBans: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              />
              <span className="text-[11px] text-slate-500">Chặn tình huống Admin bị lộ token ban hàng loạt server.</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-medium">Tên Vai trò Cách ly (Quarantine Role):</label>
              <input
                type="text"
                value={antiRaidConfig.quarantineRoleName}
                onChange={(e) => setAntiRaidConfig({ ...antiRaidConfig, quarantineRoleName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              />
              <span className="text-[11px] text-slate-500">Tự động gán role này và khóa toàn bộ kênh.</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-medium">Kênh gửi thông báo Audit Log (Channel ID):</label>
              <input
                type="text"
                value={antiRaidConfig.notifyChannelId}
                onChange={(e) => setAntiRaidConfig({ ...antiRaidConfig, notifyChannelId: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
              />
              <span className="text-[11px] text-slate-500">ID kênh Discord để bot gửi cảnh báo khẩn cấp.</span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80 space-y-3">
            <h4 className="text-xs font-semibold text-slate-200">Tùy chọn tự động hóa cao cấp:</h4>
            <div className="space-y-2">
              <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={antiRaidConfig.autoRestoreChannels}
                  onChange={(e) => setAntiRaidConfig({ ...antiRaidConfig, autoRestoreChannels: e.target.checked })}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                />
                <span>Tự động tạo lại kênh (Auto-Restore Snapshot) ngay khi bị xóa trái phép</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={antiRaidConfig.blockUnauthorizedBots}
                  onChange={(e) => setAntiRaidConfig({ ...antiRaidConfig, blockUnauthorizedBots: e.target.checked })}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                />
                <span>Tự động đá ngay bất kỳ Bot lạ nào được thêm mà chưa có trong Whitelist</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'antispam' && (
        <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-6">
          <h3 className="text-sm font-semibold text-white">Cấu hình Bộ lọc Thông minh (Smart Anti-Spam)</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-medium">Ngưỡng tương đồng Levenshtein (%):</label>
              <input
                type="number"
                value={antiSpamConfig.similarityThresholdPercent}
                onChange={(e) => setAntiSpamConfig({ ...antiSpamConfig, similarityThresholdPercent: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              />
              <span className="text-[11px] text-slate-500">Mức độ giống nhau để xác định tin nhắn bị copy-paste lặp lại.</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-medium">Độ trễ tối thiểu người gõ phím (ms):</label>
              <input
                type="number"
                value={antiSpamConfig.fastTypingGraceMs}
                onChange={(e) => setAntiSpamConfig({ ...antiSpamConfig, fastTypingGraceMs: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              />
              <span className="text-[11px] text-slate-500">Dưới ngưỡng này được tính là script/macro flood, không phải tay người.</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-medium">Số tin nhắn tối đa trong chu kỳ:</label>
              <input
                type="number"
                value={antiSpamConfig.maxMessagesInInterval}
                onChange={(e) => setAntiSpamConfig({ ...antiSpamConfig, maxMessagesInInterval: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              />
              <span className="text-[11px] text-slate-500">Giới hạn số tin nhắn gửi trong 3 giây.</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-medium">Số lượng Mentions tối đa/tin nhắn:</label>
              <input
                type="number"
                value={antiSpamConfig.maxMentionsPerMessage}
                onChange={(e) => setAntiSpamConfig({ ...antiSpamConfig, maxMentionsPerMessage: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              />
              <span className="text-[11px] text-slate-500">Chặn người dùng tag @everyone hoặc nhiều người cùng lúc.</span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80 space-y-3">
            <h4 className="text-xs font-semibold text-slate-200">Bộ lọc liên kết &amp; Phishing:</h4>
            <div className="space-y-2">
              <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={antiSpamConfig.blockDiscordInvites}
                  onChange={(e) => setAntiSpamConfig({ ...antiSpamConfig, blockDiscordInvites: e.target.checked })}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                />
                <span>Chặn tự động mọi liên kết mời tham gia Discord khác (discord.gg/...)</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={antiSpamConfig.blockPhishingLinks}
                  onChange={(e) => setAntiSpamConfig({ ...antiSpamConfig, blockPhishingLinks: e.target.checked })}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                />
                <span>Chặn các tên miền lừa đảo Nitro giả mạo và liên kết Steamcommunity fake</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'whitelist' && (
        <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-6">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-white">Danh sách Trắng (Whitelist - Miễn trừ xử phạt)</h3>
            <p className="text-xs text-slate-400">
              Các tài khoản và vai trò trong danh sách này sẽ không bao giờ bị Bot can thiệp hoặc gắn cờ sai.
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-xs text-slate-300 font-medium">Chủ sở hữu máy chủ (Server Owner ID):</label>
            <input
              type="text"
              value={whitelist.ownerId}
              onChange={(e) => setWhitelist({ ...whitelist, ownerId: e.target.value })}
              className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
            />
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-800">
            <label className="text-xs text-slate-300 font-medium">Thêm ID Quản Trị Viên Tin Cậy (Trusted Admin):</label>
            <div className="flex gap-2 max-w-md">
              <input
                type="text"
                value={newAdminId}
                onChange={(e) => setNewAdminId(e.target.value)}
                placeholder="Nhập Discord User ID (ví dụ: 123456789...)"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
              />
              <button
                type="button"
                onClick={addAdminToWhitelist}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm</span>
              </button>
            </div>

            <div className="space-y-2 pt-2">
              {whitelist.trustedAdminIds.map((id) => (
                <div
                  key={id}
                  className="flex items-center justify-between max-w-md p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-xs"
                >
                  <span className="font-mono text-slate-300">{id}</span>
                  {id !== whitelist.ownerId && (
                    <button
                      onClick={() => removeAdminFromWhitelist(id)}
                      className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'lavalink' && (
        <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-6">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-white">Quản lý Cụm Public Lavalink Nodes</h3>
            <p className="text-xs text-slate-400">
              Cơ chế Multi-Node Failover tự động chuyển tiếp nhạc sang node tiếp theo nếu node hiện tại bị sập hoặc quá tải.
            </p>
          </div>

          {/* Add custom node form */}
          <form onSubmit={handleAddNode} className="p-4 rounded-lg bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="text-xs font-semibold text-slate-200">Thêm Lavalink Node Mới:</div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input
                type="text"
                placeholder="Tên node (ví dụ: Node Private 1)"
                value={newNodeName}
                onChange={(e) => setNewNodeName(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              />
              <input
                type="text"
                placeholder="Host (ví dụ: lava.domain.com)"
                value={newNodeHost}
                onChange={(e) => setNewNodeHost(e.target.value)}
                required
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
              />
              <input
                type="number"
                placeholder="Port (mặc định 443 hoặc 2333)"
                value={newNodePort}
                onChange={(e) => setNewNodePort(Number(e.target.value))}
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
              />
              <input
                type="password"
                placeholder="Password"
                value={newNodePass}
                onChange={(e) => setNewNodePass(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm Node Vào Cụm</span>
            </button>
          </form>

          {/* List of nodes */}
          <div className="space-y-2.5">
            {nodes.map((node, index) => (
              <div
                key={node.host + index}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-lg bg-slate-950/70 border border-slate-800 text-xs gap-2"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span className="font-semibold text-white">{node.name}</span>
                    <span className="text-[11px] text-slate-500 font-mono">({node.region})</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {node.host}:{node.port} · Ping: <span className="text-emerald-400">{node.ping}ms</span> · Ram: {node.memoryUsage}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => removeNode(index)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                    title="Xóa node"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
