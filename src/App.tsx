import React, { useState } from 'react';
import JSZip from 'jszip';
import { Navbar } from './components/Navbar';
import { DashboardOverview } from './components/DashboardOverview';
import { AntiRaidConsole } from './components/AntiRaidConsole';
import { AntiSpamTester } from './components/AntiSpamTester';
import { MusicPlayerConsole } from './components/MusicPlayerConsole';
import { ConfigEditor } from './components/ConfigEditor';
import { CodeExporter } from './components/CodeExporter';
import { SetupGuide } from './components/SetupGuide';

import {
  DEFAULT_ANTI_RAID_CONFIG,
  DEFAULT_ANTI_SPAM_CONFIG,
  DEFAULT_WHITELIST
} from './data/defaultConfig';
import { BOT_SOURCE_FILES } from './data/botSourceFiles';
import { AntiRaidThresholds, AntiSpamSettings, ServerWhitelist } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [discordToken, setDiscordToken] = useState<string>('');
  const [clientId, setClientId] = useState<string>('');
  const [antiRaidConfig, setAntiRaidConfig] = useState<AntiRaidThresholds>(DEFAULT_ANTI_RAID_CONFIG);
  const [antiSpamConfig, setAntiSpamConfig] = useState<AntiSpamSettings>(DEFAULT_ANTI_SPAM_CONFIG);
  const [whitelist, setWhitelist] = useState<ServerWhitelist>(DEFAULT_WHITELIST);
  const [isLockdownActive, setIsLockdownActive] = useState(false);

  const toggleEmergencyLockdown = () => {
    setIsLockdownActive((prev) => !prev);
  };

  const handleExportZip = async () => {
    try {
      const zip = new JSZip();
      BOT_SOURCE_FILES.forEach((f) => {
        zip.file(f.path, f.content);
      });

      // Dynamically generate real .env file with user's token and ID
      const realEnv = `# Discord Bot Credentials
DISCORD_TOKEN=${discordToken.trim() || 'YOUR_DISCORD_BOT_TOKEN_HERE'}
CLIENT_ID=${clientId.trim() || 'YOUR_DISCORD_APPLICATION_CLIENT_ID'}
OWNER_ID=1542028462154317907
LOG_CHANNEL_ID=

# Whitelist (Separated by comma)
WHITELIST_USERS=1542028462154317907
WHITELIST_ROLES=

# Anti-Raid Thresholds (Sliding window in seconds)
RAID_WINDOW_SECONDS=${antiRaidConfig.timeWindowSeconds}
MAX_CHANNEL_DELETES=${antiRaidConfig.maxChannelDeletes}
MAX_ROLE_DELETES=${antiRaidConfig.maxRoleDeletes}
MAX_BANS=${antiRaidConfig.maxBans}
MAX_KICKS=${antiRaidConfig.maxKicks}

# Public Lavalink Nodes
LAVALINK_HOST_1=lava-v4.ajieblogs.eu.org:443
LAVALINK_PASS_1=https://dsc.gg/ajidevserver

LAVALINK_HOST_2=lavalink.serenetia.com:443
LAVALINK_PASS_2=youshallnotpass

LAVALINK_HOST_3=node1.inrl.in:443
LAVALINK_PASS_3=inrl
`;
      zip.file('.env', realEnv);

      zip.file(
        'README.md',
        `# AegisCore Discord Bot
Anti-Raid Nuke, Smart Anti-Spam & Lavalink Music Suite.
Owner ID: 1542028462154317907

## Chạy Bot
1. npm install
2. npm start
*(File .env đã được tạo và điền sẵn token cho bạn).*
`
      );
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'aegis-antiraid-music-bot.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onExportZip={handleExportZip}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'overview' && (
          <DashboardOverview
            antiRaidConfig={antiRaidConfig}
            antiSpamConfig={antiSpamConfig}
            setActiveTab={setActiveTab}
            onEmergencyLockdown={toggleEmergencyLockdown}
            isLockdownActive={isLockdownActive}
          />
        )}

        {activeTab === 'antiraid' && (
          <AntiRaidConsole config={antiRaidConfig} />
        )}

        {activeTab === 'antispam' && (
          <AntiSpamTester settings={antiSpamConfig} />
        )}

        {activeTab === 'music' && (
          <MusicPlayerConsole />
        )}

        {activeTab === 'guide' && (
          <SetupGuide
            discordToken={discordToken}
            setDiscordToken={setDiscordToken}
            clientId={clientId}
            setClientId={setClientId}
            onExportZip={handleExportZip}
          />
        )}

        {activeTab === 'config' && (
          <ConfigEditor
            antiRaidConfig={antiRaidConfig}
            setAntiRaidConfig={setAntiRaidConfig}
            antiSpamConfig={antiSpamConfig}
            setAntiSpamConfig={setAntiSpamConfig}
            whitelist={whitelist}
            setWhitelist={setWhitelist}
          />
        )}

        {activeTab === 'export' && (
          <CodeExporter onExportZip={handleExportZip} />
        )}
      </main>

      {/* Clean Footer */}
      <footer className="border-t border-slate-800/80 bg-[#090d16] py-5 px-6 mt-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">AegisCore Architecture</span>
            <span>·</span>
            <span>Discord.js v14 &amp; Shoukaku Lavalink Client</span>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://discord.com/developers/applications"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-300 transition-colors"
            >
              Discord Developer Portal
            </a>
            <span>·</span>
            <a
              href="https://lavalink.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-300 transition-colors"
            >
              Lavalink Docs
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
