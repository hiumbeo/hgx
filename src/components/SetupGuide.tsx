import React, { useState } from 'react';
import {
  BookOpen,
  Key,
  ExternalLink,
  CheckCircle2,
  Copy,
  Check,
  Terminal,
  AlertTriangle,
  ShieldCheck,
  Music,
  ArrowRight
} from 'lucide-react';

interface SetupGuideProps {
  discordToken: string;
  setDiscordToken: (token: string) => void;
  clientId: string;
  setClientId: (id: string) => void;
  onExportZip: () => void;
}

export const SetupGuide: React.FC<SetupGuideProps> = ({
  discordToken,
  setDiscordToken,
  clientId,
  setClientId,
  onExportZip
}) => {
  const [showToken, setShowToken] = useState(false);
  const [copiedStep, setCopiedStep] = useState<string | null>(null);

  const inviteUrl = clientId.trim()
    ? `https://discord.com/api/oauth2/authorize?client_id=${clientId.trim()}&permissions=8&scope=bot%20applications.commands`
    : '';

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(id);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">Chỗ Nhập Token Bot &amp; Hướng Dẫn Sử Dụng</h1>
            <p className="text-xs text-slate-400">
              Nhập Token và Client ID của bạn vào khung bên dưới để tự động tạo file cấu hình và link mời bot.
            </p>
          </div>
        </div>
      </div>

      {/* Primary Token & Credentials Entry Box */}
      <div className="p-5 rounded-xl bg-indigo-950/30 border-2 border-indigo-500/40 space-y-4 shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-indigo-500/20">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/30 text-indigo-300 flex items-center justify-center">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">CHỖ NHẬP TOKEN BOT VÀ CLIENT ID TẠI ĐÂY</h2>
              <div className="text-[11px] text-indigo-300">
                Nhập vào đây, khi bấm tải ZIP file cấu hình <code className="font-mono text-white">.env</code> sẽ tự điền sẵn cho bạn!
              </div>
            </div>
          </div>

          <div className="text-right">
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
              discordToken.trim() ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
            }`}>
              {discordToken.trim() ? '✓ Đã nhập Token' : 'Chưa nhập Token'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Token input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-slate-200 font-semibold flex items-center gap-1.5">
                <span>1. Discord Bot Token (DISCORD_TOKEN):</span>
              </label>
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
              >
                {showToken ? 'Ẩn token' : 'Hiện token'}
              </button>
            </div>
            <input
              type={showToken ? 'text' : 'password'}
              placeholder="Dán mã Token từ Discord Developer Portal (bắt đầu bằng MTA...)"
              value={discordToken}
              onChange={(e) => setDiscordToken(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 font-mono"
            />
            <span className="text-[11px] text-slate-400 block">
              *Lấy tại: Discord Dev Portal &gt; Tab <strong>Bot</strong> &gt; Nút <strong>Reset Token</strong>.
            </span>
          </div>

          {/* Client ID input */}
          <div className="space-y-1.5">
            <label className="text-slate-200 font-semibold block">
              2. Application Client ID (CLIENT_ID):
            </label>
            <input
              type="text"
              placeholder="Dán dãy số Application ID (ví dụ: 134567890123...)"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 font-mono"
            />
            <span className="text-[11px] text-slate-400 block">
              *Lấy tại: Discord Dev Portal &gt; Mục <strong>General Information</strong> &gt; Application ID.
            </span>
          </div>
        </div>

        {/* Owner ID display */}
        <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
          <div className="space-y-0.5">
            <span className="text-slate-400">3. Owner ID Server (Chủ sở hữu máy chủ):</span>
            <div className="font-mono text-emerald-400 font-bold">1542028462154317907 (Của bạn - Đã khóa cố định)</div>
          </div>

          <div className="flex items-center gap-2">
            {inviteUrl && (
              <a
                href={inviteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <span>Mời Bot Vào Discord</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              onClick={onExportZip}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span>Tải ZIP đã điền sẵn Token</span>
            </button>
          </div>
        </div>
      </div>

      {/* Step by step guide */}
      <div className="space-y-4">
        {/* Step 1 */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-400 border border-indigo-500/40 text-xs font-bold flex items-center justify-center">
              1
            </span>
            <h3 className="text-sm font-bold text-white">Tạo Ứng Dụng Bot trên Discord Developer Portal</h3>
          </div>

          <div className="text-xs text-slate-300 space-y-2 pl-8 leading-relaxed">
            <p>
              1. Truy cập vào:{' '}
              <a
                href="https://discord.com/developers/applications"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:underline inline-flex items-center gap-1 font-semibold"
              >
                discord.com/developers/applications <ExternalLink className="w-3 h-3" />
              </a>
            </p>
            <p>
              2. Nhấn nút <strong>New Application</strong> ở góc phải trên, đặt tên cho bot (ví dụ: <code className="text-indigo-300 font-mono">Aegis Guard</code>) và nhấn Create.
            </p>
            <p>
              3. Tại mục <strong>General Information</strong>, copy dòng <strong>Application ID</strong> (đây chính là Client ID để tạo link mời ở trên).
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-amber-500/20 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold flex items-center justify-center">
              2
            </span>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Bật 3 Quyền Gateway Intents (BẮT BUỘC để đọc tin nhắn và Anti-Spam)</span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </h3>
          </div>

          <div className="text-xs text-slate-300 space-y-2.5 pl-8 leading-relaxed">
            <p>
              Vào mục <strong>Bot</strong> ở menu bên trái, cuộn xuống phần <strong>Privileged Gateway Intents</strong> và gạt bật cả 3 mục:
            </p>
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1.5 font-mono text-slate-200">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>[x] Presence Intent</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>[x] Server Members Intent</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>[x] Message Content Intent (Để bot đọc tin nhắn phân tích spam)</span>
              </div>
            </div>
            <p>
              Nhấn <strong>Save Changes</strong>. Tiếp theo, nhấn nút <strong>Reset Token</strong> và copy chuỗi <strong>Token</strong> (đây là mật khẩu để bot đăng nhập).
            </p>
          </div>
        </div>

        {/* Step 3 */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-400 border border-indigo-500/40 text-xs font-bold flex items-center justify-center">
              3
            </span>
            <h3 className="text-sm font-bold text-white">Điền Token vào File .env và Khởi Chạy</h3>
          </div>

          <div className="text-xs text-slate-300 space-y-3 pl-8 leading-relaxed">
            <p>
              Tải file zip source code bằng nút <strong>"Tải Source Bot (.ZIP)"</strong> ở góc trên trang này, giải nén ra thư mục trên máy tính hoặc VPS của bạn.
            </p>

            <div className="space-y-1.5">
              <span className="font-semibold text-slate-200">Tạo file .env từ file .env.example:</span>
              <div className="p-3 rounded-lg bg-slate-950/90 border border-slate-800 font-mono text-xs text-slate-300 flex items-center justify-between">
                <span>DISCORD_TOKEN=MTA... (Dán token bot của bạn vào đây)</span>
                <button
                  onClick={() => copyText('DISCORD_TOKEN=YOUR_TOKEN_HERE\nCLIENT_ID=YOUR_CLIENT_ID', 'env')}
                  className="text-slate-400 hover:text-white p-1"
                >
                  {copiedStep === 'env' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="font-semibold text-slate-200">Chạy các lệnh trong Terminal (Command Prompt / Powershell / Bash):</span>
              <div className="p-3 rounded-lg bg-slate-950/90 border border-slate-800 font-mono text-xs text-indigo-300 space-y-1 relative">
                <div>npm install</div>
                <div>npm start</div>
                <button
                  onClick={() => copyText('npm install && npm start', 'npm')}
                  className="absolute top-3 right-3 text-slate-400 hover:text-white p-1"
                >
                  {copiedStep === 'npm' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <p className="text-emerald-400 font-medium">
              Khi thấy dòng: <code className="font-mono bg-slate-950 px-2 py-0.5 rounded text-white">[AegisCore] Logged in as YourBot#0000</code> và <code className="font-mono bg-slate-950 px-2 py-0.5 rounded text-white">[Lavalink Connected]</code> là bot đã online 100%!
            </p>
          </div>
        </div>

        {/* Step 4 */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-rose-500/20 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center justify-center">
              4
            </span>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>LƯU Ý CỰC KỲ QUAN TRỌNG: Phân Cấp Vai Trò (Role Hierarchy)</span>
              <ShieldCheck className="w-4 h-4 text-rose-400" />
            </h3>
          </div>

          <div className="text-xs text-slate-300 space-y-2 pl-8 leading-relaxed">
            <p>
              Quy tắc của Discord: <strong>Bot chỉ có thể quản lý hoặc tước quyền những người có vai trò NẰM DƯỚI vai trò của bot.</strong>
            </p>
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
              <div>1. Mở Discord &gt; Chuột phải vào tên Server &gt; <strong>Server Settings</strong> &gt; <strong>Roles</strong>.</div>
              <div>2. Kéo vai trò mang tên Bot (hoặc vai trò Aegis) lên <strong>trên cùng</strong> (chỉ dưới quyền Server Owner).</div>
              <div>3. Khi đó, nếu có Admin hay Moderator nào bị hack token xóa kênh hay ban bậy, Bot mới có đủ thẩm quyền để tước quyền Admin và cách ly họ!</div>
            </div>
          </div>
        </div>

        {/* Step 5 */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-400 border border-indigo-500/40 text-xs font-bold flex items-center justify-center">
              5
            </span>
            <h3 className="text-sm font-bold text-white">Lệnh Tự Động Tạo Kênh Log &amp; Danh Sách Slash Commands</h3>
          </div>

          <div className="space-y-3 pl-8 text-xs leading-relaxed">
            <div className="p-3.5 rounded-lg bg-indigo-950/40 border border-indigo-500/40 text-indigo-200 space-y-1.5">
              <div className="font-bold text-sm text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Lệnh mới: /setup-logs (Tạo kênh Log tự động)</span>
              </div>
              <p>
                Chỉ cần gõ lệnh: <code className="bg-slate-950 px-2 py-0.5 rounded text-white font-mono font-bold">/setup-logs</code> trong Discord!
              </p>
              <p className="text-[11px] text-slate-300">
                Bot sẽ tự động tạo một danh mục <code className="font-mono text-indigo-300">🛡️ AN NINH AEGIS</code> và kênh riêng tư <code className="font-mono text-emerald-400">#aegis-security-logs</code> ẩn với tất cả mọi người (khóa @everyone), chỉ có Bot và Owner (<code className="font-mono text-amber-300">1542028462154317907</code>) xem được. Mọi sự cố phá hoại, xóa kênh, xóa role sẽ được bắn thông báo tự động vào đây!
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1.5">
                <span className="font-bold text-indigo-400 flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5" />
                  <span>Lệnh Nhạc Lavalink</span>
                </span>
                <ul className="space-y-1 text-slate-300 font-mono">
                  <li><strong className="text-white">/play &lt;link hoặc tên&gt;</strong>: Phát bài hát (YouTube, SoundCloud, mp3)</li>
                  <li><strong className="text-white">/skip</strong>: Bỏ qua bài hát hiện tại</li>
                  <li><strong className="text-white">/loop &lt;off | track | queue&gt;</strong>: Bật/tắt lặp 1 bài hoặc cả queue</li>
                  <li><strong className="text-white">/queue</strong>: Xem danh sách bài chờ</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1.5">
                <span className="font-bold text-rose-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Lệnh Quản Lý &amp; Bảo Vệ</span>
                </span>
                <ul className="space-y-1 text-slate-300 font-mono">
                  <li><strong className="text-white">/setup-logs</strong>: Tự động tạo kênh Log riêng tư</li>
                  <li><strong className="text-white">/lockdown &lt;true/false&gt;</strong>: Khóa hoặc mở chat kênh khẩn cấp</li>
                  <li><strong className="text-white">/purge &lt;số lượng&gt;</strong>: Xóa sạch tin nhắn rác hàng loạt</li>
                  <li><strong className="text-white">/antiraid-status</strong>: Kiểm tra trạng thái lá chắn Anti-Nuke</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Step 6 */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-emerald-500/30 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold flex items-center justify-center">
              6
            </span>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Hướng Dẫn Host Miễn Phí 24/7 Trên Render (render.com)</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono font-semibold">24/7 Uptime</span>
            </h3>
          </div>

          <div className="text-xs text-slate-300 space-y-3 pl-8 leading-relaxed">
            <p>
              Mã nguồn AegisCore đã được tích hợp sẵn <strong>Web Server Keep-Alive trên cổng PORT (mặc định 3000)</strong>, tương thích 100% với nền tảng <strong>Render Web Service</strong> miễn phí.
            </p>

            <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="font-bold text-slate-200">Các bước thực hiện trên Render:</div>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
                <li>Đăng ký tài khoản miễn phí tại <a href="https://render.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">render.com</a>.</li>
                <li>Tạo một repository mới trên GitHub (hoặc GitLab) và tải toàn bộ file code từ nút <strong>"Tải Source Bot (.ZIP)"</strong> lên repo đó.</li>
                <li>Trên Dashboard của Render, nhấn nút <strong>New +</strong> &gt; Chọn <strong>Web Service</strong> &gt; Kết nối với GitHub Repository của bạn.</li>
                <li>Điền các thông số:
                  <div className="mt-1 pl-4 space-y-1 font-mono text-emerald-300 text-[11px]">
                    <div>- <strong>Runtime</strong>: Node</div>
                    <div>- <strong>Build Command</strong>: npm install</div>
                    <div>- <strong>Start Command</strong>: npm start</div>
                    <div>- <strong>Instance Type</strong>: Free</div>
                  </div>
                </li>
                <li>Cuộn xuống phần <strong>Environment Variables</strong> (Biến môi trường) và thêm:
                  <div className="mt-1 pl-4 space-y-1 font-mono text-indigo-300 text-[11px]">
                    <div>• DISCORD_TOKEN = (Token bot của bạn)</div>
                    <div>• CLIENT_ID = (Application ID của bạn)</div>
                    <div>• OWNER_ID = 1542028462154317907</div>
                    <div>• PORT = 3000</div>
                  </div>
                </li>
                <li>Nhấn <strong>Create Web Service</strong>. Render sẽ tự động build và chạy bot trong 60 giây!</li>
              </ol>
            </div>

            <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-emerald-200 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Bí quyết giữ Bot chạy vĩnh viễn không bao giờ sleep:</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Sau khi Render báo <code className="text-emerald-400 font-bold">Live</code>, bạn copy đường link URL của Web Service (ví dụ: <code className="text-white font-mono">https://aegis-discord-bot.onrender.com</code>). Truy cập trang miễn phí <a href="https://uptimerobot.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">UptimeRobot.com</a> (hoặc cron-job.org), tạo 1 monitor HTTP ping link đó mỗi 5 phút một lần. Render sẽ luôn nhận được request và giữ Bot online 24/7/365!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
