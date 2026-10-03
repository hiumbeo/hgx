export type LoopMode = 'off' | 'track' | 'queue';

export type TrackSource = 'youtube' | 'soundcloud' | 'mp3' | 'spotify' | 'custom';

export interface MusicTrack {
  id: string;
  title: string;
  author: string;
  duration: number; // in seconds
  uri: string;
  thumbnail: string;
  source: TrackSource;
  requester: {
    id: string;
    username: string;
    avatar: string;
  };
}

export interface LavalinkNode {
  name: string;
  host: string;
  port: number;
  password: string;
  secure: boolean;
  status: 'connected' | 'connecting' | 'failed';
  ping: number;
  region: string;
  memoryUsage?: string;
  activePlayers?: number;
}

export interface AntiRaidThresholds {
  maxChannelDeletes: number; // max per window
  maxChannelCreates: number;
  maxRoleDeletes: number;
  maxRoleCreates: number;
  maxBans: number;
  maxKicks: number;
  maxWebhookCreates: number;
  timeWindowSeconds: number;
  autoQuarantine: boolean;
  quarantineRoleName: string;
  notifyChannelId: string;
  autoRestoreChannels: boolean;
  blockUnauthorizedBots: boolean;
}

export interface AntiSpamSettings {
  maxMessagesInInterval: number; // e.g. 5 msgs
  intervalMs: number; // e.g. 3000ms
  similarityThresholdPercent: number; // e.g. 75%
  maxMentionsPerMessage: number; // e.g. 4
  blockDiscordInvites: boolean;
  blockPhishingLinks: boolean;
  fastTypingGraceMs: number; // minimum delta between messages for human typing
  actionOnSpam: 'warn' | 'delete' | 'timeout_1m' | 'timeout_10m' | 'kick';
  actionOnRaidBurst: 'timeout_1h' | 'kick' | 'ban' | 'quarantine';
}

export interface ServerWhitelist {
  ownerId: string;
  trustedAdminIds: string[];
  trustedRoleIds: string[];
  whitelistedBotIds: string[];
}

export interface AntiRaidIncident {
  id: string;
  timestamp: number;
  actor: {
    id: string;
    name: string;
    avatar: string;
    isBot: boolean;
  };
  actionType: 'CHANNEL_DELETE' | 'ROLE_DELETE' | 'MASS_BAN' | 'MASS_KICK' | 'WEBHOOK_SPAM' | 'BOT_ADD_ATTEMPT' | 'MASS_MENTION';
  count: number;
  threshold: number;
  status: 'intercepted' | 'quarantined' | 'reverted';
  details: string;
}

export interface SpamAnalysisResult {
  isSpam: boolean;
  isRaidBurst: boolean;
  isFastHumanTyping: boolean;
  similarityScore: number;
  typingSpeedWpm: number;
  mentionCount: number;
  hasInviteLink: boolean;
  hasPhishingUrl: boolean;
  reason: string;
  recommendedAction: string;
  metrics: {
    burstRateMs: number;
    charEntropy: number;
    duplicateWordRatio: number;
  };
}

export interface BotSourceFile {
  path: string;
  name: string;
  category: 'core' | 'music' | 'protection' | 'commands' | 'config';
  description: string;
  content: string;
}
