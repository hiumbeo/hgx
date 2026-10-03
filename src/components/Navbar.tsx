import React from 'react';
import { ShieldCheck, Download } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onExportZip: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, onExportZip }) => {
  const navItems = [
    { id: 'overview', label: 'Tổng quan' },
    { id: 'antiraid', label: 'Anti-Raid / Nuke' },
    { id: 'antispam', label: 'Smart Anti-Spam' },
    { id: 'music', label: 'Lavalink Music' },
    { id: 'guide', label: 'Cách dùng trên Discord' },
    { id: 'config', label: 'Cấu hình' },
    { id: 'export', label: 'Mã nguồn Bot' },
  ];

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-3.5 bg-[#0b0f19]/95 backdrop-blur-md border-b border-slate-800/80">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <a
          href="#overview"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('overview');
          }}
          className="text-base font-bold tracking-tight text-white hover:text-indigo-400 transition-colors"
        >
          AegisCore
        </a>
      </div>

      {/* Zone 2: Clean text navigation links */}
      <nav className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1 rounded-lg border border-slate-800">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: Primary action */}
      <div className="flex items-center gap-3">
        <button
          onClick={onExportZip}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors shadow-sm whitespace-nowrap cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Tải Source Bot (.ZIP)</span>
        </button>
      </div>
    </header>
  );
};
