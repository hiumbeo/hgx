import React, { useState } from 'react';
import {
  FileCode,
  Copy,
  Check,
  Download,
  Terminal,
  FolderTree,
  ExternalLink,
  Layers,
  Sparkles
} from 'lucide-react';
import JSZip from 'jszip';
import { BOT_SOURCE_FILES } from '../data/botSourceFiles';

interface CodeExporterProps {
  onExportZip: () => void;
}

export const CodeExporter: React.FC<CodeExporterProps> = () => {
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  const currentFile = BOT_SOURCE_FILES[selectedFileIndex];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    try {
      setIsZipping(true);
      const zip = new JSZip();

      // Add each file to the zip archive preserving directory structure
      BOT_SOURCE_FILES.forEach((f) => {
        zip.file(f.path, f.content);
      });

      // Add README.md
      const readmeContent = `# AegisCore Discord Bot
Anti-Raid Nuke, Smart Anti-Spam & Lavalink Music Suite.

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy

### 1. Chuẩn Bị
- Cài đặt Node.js v18 trở lên (khuyên dùng Node.js 20 LTS).
- Tạo Bot trên Discord Developer Portal: https://discord.com/developers/applications
- Bật 3 mục trong tab Bot -> **Privileged Gateway Intents**:
  - [x] Presence Intent
  - [x] Server Members Intent
  - [x] Message Content Intent

### 2. Thiết Lập Biến Môi Trường
Đổi tên file \`.env.example\` thành \`.env\`:
\`\`\`bash
cp .env.example .env
\`\`\`
Điền \`DISCORD_TOKEN\` và \`CLIENT_ID\` của bạn.

### 3. Cài Đặt Dependencies
\`\`\`bash
npm install
\`\`\`

### 4. Khởi Chạy Bot
\`\`\`bash
npm start
\`\`\`

### 5. (Tùy chọn) Chạy Bằng Docker Compose (Bao gồm cả Lavalink v4)
\`\`\`bash
docker compose up -d
\`\`\`
`;
      zip.file('README.md', readmeContent);

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'aegis-antiraid-music-bot.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to create ZIP:', err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and download bar */}
      <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Mã Nguồn Độc Lập Cho Discord Bot (Production Ready)</h2>
              <p className="text-xs text-slate-400">
                100% chuẩn logic, không thiếu sót, sẵn sàng copy hoặc tải về chạy trực tiếp trên VPS/Server.
              </p>
            </div>
          </div>

          <button
            onClick={handleDownloadZip}
            disabled={isZipping}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isZipping ? 'Đang đóng gói...' : 'Tải trọn bộ Project (.ZIP)'}</span>
          </button>
        </div>
      </div>

      {/* Main Code Viewer Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: File Tree Explorer (4 cols) */}
        <div className="lg:col-span-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <FolderTree className="w-3.5 h-3.5 text-indigo-400" />
              <span>Cấu trúc Thư mục</span>
            </span>
            <span className="text-[11px] text-slate-500 font-mono">{BOT_SOURCE_FILES.length} files</span>
          </div>

          <div className="space-y-1">
            {BOT_SOURCE_FILES.map((file, idx) => {
              const isSelected = idx === selectedFileIndex;
              return (
                <button
                  key={file.path}
                  onClick={() => setSelectedFileIndex(idx)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono transition-colors flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <span className="truncate">{file.path}</span>
                  <span className="text-[10px] uppercase font-sans text-slate-500 shrink-0 ml-1">
                    {file.category}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Setup Notes */}
          <div className="pt-3 border-t border-slate-800 space-y-2 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5 font-semibold text-slate-300">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span>3 Bước Triển Khai Nhanh:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 pl-1 text-slate-400 font-mono">
              <li>npm install</li>
              <li>Tạo file .env từ .env.example</li>
              <li>npm start</li>
            </ol>
          </div>
        </div>

        {/* Right: Code Viewer & Copy (8 cols) */}
        <div className="lg:col-span-8 p-5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
            <div className="space-y-0.5 min-w-0">
              <div className="font-mono text-white font-semibold truncate">{currentFile.path}</div>
              <div className="text-[11px] text-slate-400">{currentFile.description}</div>
            </div>

            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ml-3"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Đã sao chép</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Sao chép mã</span>
                </>
              )}
            </button>
          </div>

          {/* Code View with Scroll */}
          <div className="relative rounded-lg bg-slate-950/90 border border-slate-800/80 p-4 overflow-x-auto max-h-[500px]">
            <pre className="font-mono text-xs text-slate-300 leading-relaxed">
              <code>{currentFile.content}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
