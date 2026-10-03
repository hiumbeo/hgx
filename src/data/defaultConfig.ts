import { AntiRaidThresholds, AntiSpamSettings, ServerWhitelist, MusicTrack } from '../types';

export const DEFAULT_ANTI_RAID_CONFIG: AntiRaidThresholds = {
  maxChannelDeletes: 2,
  maxChannelCreates: 3,
  maxRoleDeletes: 2,
  maxRoleCreates: 3,
  maxBans: 3,
  maxKicks: 3,
  maxWebhookCreates: 2,
  timeWindowSeconds: 10,
  autoQuarantine: true,
  quarantineRoleName: 'Aegis-Quarantine',
  notifyChannelId: '112233445566778899',
  autoRestoreChannels: true,
  blockUnauthorizedBots: true,
};

export const DEFAULT_ANTI_SPAM_CONFIG: AntiSpamSettings = {
  maxMessagesInInterval: 4,
  intervalMs: 3000,
  similarityThresholdPercent: 75,
  maxMentionsPerMessage: 3,
  blockDiscordInvites: true,
  blockPhishingLinks: true,
  fastTypingGraceMs: 400,
  actionOnSpam: 'delete',
  actionOnRaidBurst: 'timeout_1h',
};

export const DEFAULT_WHITELIST: ServerWhitelist = {
  ownerId: '1542028462154317907',
  trustedAdminIds: ['1542028462154317907'],
  trustedRoleIds: ['111122223333444455'],
  whitelistedBotIds: ['100020003000400050'],
};

export const INITIAL_TRACKS: MusicTrack[] = [
  {
    id: 'yt-1',
    title: 'Pháo - 2 Phút Hơn (KAIZ Remix)',
    author: 'Pháo Official',
    duration: 184,
    uri: 'https://www.youtube.com/watch?v=7wa_Zk684lM',
    thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80',
    source: 'youtube',
    requester: {
      id: 'usr_1',
      username: 'He_Owner',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
    }
  },
  {
    id: 'sc-1',
    title: 'Chillectro Cyber Lofi Session #42',
    author: 'SynthHaven Audio',
    duration: 215,
    uri: 'https://soundcloud.com/synthhaven/cyber-lofi-night',
    thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=400&q=80',
    source: 'soundcloud',
    requester: {
      id: 'usr_2',
      username: 'Alex_Mod',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
    }
  },
  {
    id: 'mp3-1',
    title: 'Direct Hi-Fi Stream (Vocal Chillout 320kbps)',
    author: 'FreeAudio CDN',
    duration: 162,
    uri: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
    thumbnail: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=400&q=80',
    source: 'mp3',
    requester: {
      id: 'usr_1',
      username: 'He_Owner',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
    }
  }
];
