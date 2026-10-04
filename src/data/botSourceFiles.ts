import { BotSourceFile } from '../types';

export const BOT_SOURCE_FILES: BotSourceFile[] = [
  {
    path: 'src/index.ts',
    name: 'index.ts',
    category: 'core',
    description: 'Discord.js v14 Client entry point with Gateway Intents, event listeners, and Shoukaku Lavalink manager.',
    content: `import {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  REST,
  Routes,
  Events,
  ActivityType
} from 'discord.js';
import http from 'http';
import { Shoukaku, Connectors } from 'shoukaku';
import { CONFIG } from './config';
import { AntiRaidManager } from './systems/antiRaid';
import { AntiSpamManager } from './systems/antiSpam';
import { MusicManager } from './systems/musicManager';
import { musicCommands, handleMusicButton } from './commands/music';
import { moderationCommands } from './commands/moderation';

// 1. Initialize Lightweight Web Server for Render / UptimeRobot 24/7 Keep-Alive
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'online',
      service: 'AegisCore Discord Bot',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }));
  } else {
    res.writeHead(404);
    res.end();
  }
});
server.listen(PORT, () => {
  console.log(\`[Render Healthcheck] Web Server running on port \${PORT} for 24/7 Uptime\`);
});

// 2. Initialize Discord Client with all required intents
export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildInvites
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember]
});

// 3. Initialize Shoukaku Lavalink Cluster
export const shoukaku = new Shoukaku(
  new Connectors.DiscordJS(client),
  CONFIG.LAVALINK_NODES,
  {
    moveOnDisconnect: true,
    resume: true,
    resumeTimeout: 30,
    reconnectTries: 10,
    restTimeout: 10000
  }
);

shoukaku.on('error', (name, error) => {
  console.error(\`[Lavalink Error] Node \${name}:\`, error.message);
});

shoukaku.on('ready', (name) => {
  console.log(\`[Lavalink Connected] Node \${name} is ready.\`);
});

shoukaku.on('disconnect', (name, count) => {
  console.warn(\`[Lavalink Disconnected] Node \${name} lost connection. Reconnect try #\${count}\`);
});

// 4. Initialize Core Managers
export const musicManager = new MusicManager(client, shoukaku);
export const antiRaid = new AntiRaidManager(client);
export const antiSpam = new AntiSpamManager(client);

// 5. Command Registry
const slashCommands = [...musicCommands, ...moderationCommands];

client.once(Events.ClientReady, async (c) => {
  console.log(\`[AegisCore] Logged in as \${c.user.tag} (ID: \${c.user.id})\`);
  
  c.user.setPresence({
    activities: [{ name: 'Shield Active | /help | /play', type: ActivityType.Listening }],
    status: 'online'
  });

  // Register Global Slash Commands
  const rest = new REST({ version: '10' }).setToken(CONFIG.DISCORD_TOKEN);
  try {
    console.log('[AegisCore] Registering slash commands...');
    await rest.put(
      Routes.applicationCommands(c.user.id),
      { body: slashCommands.map(cmd => cmd.data.toJSON()) }
    );
    console.log('[AegisCore] Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('[AegisCore] Failed to register slash commands:', error);
  }
});

// 6. Message Monitoring (Anti-Spam & Fast Typing Heuristics)
client.on(Events.MessageCreate, async (message) => {
  if (!message.guild || message.author.bot) return;
  await antiSpam.handleMessage(message);
});

// 7. Guild Audit Log Protection (Anti-Nuke / Anti-Raid)
client.on(Events.ChannelDelete, async (channel) => {
  if (!channel.guild) return;
  await antiRaid.handleChannelDelete(channel);
});

client.on(Events.GuildRoleDelete, async (role) => {
  await antiRaid.handleRoleDelete(role);
});

client.on(Events.GuildBanAdd, async (ban) => {
  await antiRaid.handleBanAdd(ban);
});

client.on(Events.GuildMemberRemove, async (member) => {
  await antiRaid.handleMemberKick(member);
});

client.on(Events.GuildMemberAdd, async (member) => {
  await antiRaid.handleMemberJoin(member);
});

// 8. Interaction Handler (Slash commands & Persistent Music Buttons)
client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const cmd = slashCommands.find(c => c.data.name === interaction.commandName);
    if (!cmd) return;
    try {
      await cmd.execute(interaction);
    } catch (err: any) {
      console.error(\`Command error [\${interaction.commandName}]:\`, err);
      const replyFn = interaction.replied || interaction.deferred ? 'followUp' : 'reply';
      await interaction[replyFn]({
        content: \`⚠️ Lỗi thực thi lệnh: \${err.message || 'Lỗi không xác định.'}\`,
        ephemeral: true
      });
    }
  } else if (interaction.isButton()) {
    await handleMusicButton(interaction);
  }
});

// 9. Graceful Process Handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection at]:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]:', err);
});

client.login(CONFIG.DISCORD_TOKEN);
`
  },
  {
    path: 'src/config.ts',
    name: 'config.ts',
    category: 'config',
    description: 'Type-safe configuration parser loading environment variables and public Lavalink nodes.',
    content: `import dotenv from 'dotenv';
dotenv.config();

export const CONFIG = {
  DISCORD_TOKEN: process.env.DISCORD_TOKEN || '',
  CLIENT_ID: process.env.CLIENT_ID || '',
  OWNER_ID: process.env.OWNER_ID || '1542028462154317907',
  LOG_CHANNEL_ID: process.env.LOG_CHANNEL_ID || '',
  DEFAULT_PREFIX: '/',

  // Anti-Raid Thresholds (Sliding window in seconds)
  ANTI_RAID: {
    WINDOW_SECONDS: Number(process.env.RAID_WINDOW_SECONDS) || 10,
    MAX_CHANNEL_DELETES: Number(process.env.MAX_CHANNEL_DELETES) || 2,
    MAX_ROLE_DELETES: Number(process.env.MAX_ROLE_DELETES) || 2,
    MAX_BANS: Number(process.env.MAX_BANS) || 3,
    MAX_KICKS: Number(process.env.MAX_KICKS) || 3,
    AUTO_QUARANTINE: true,
    QUARANTINE_ROLE_NAME: 'Aegis-Quarantine',
    AUTO_RESTORE: true,
    BLOCK_UNAUTHORIZED_BOTS: true,
  },

  // Smart Anti-Spam (Distinguishes rapid human typing vs raid flood)
  ANTI_SPAM: {
    INTERVAL_MS: 3000,
    MAX_MESSAGES: 4,
    SIMILARITY_PERCENT: 75,
    MAX_MENTIONS: 4,
    BLOCK_INVITES: true,
    BLOCK_PHISHING: true,
    FAST_TYPING_GRACE_MS: 400
  },

  // Whitelist: Protected from any automated punishments (Owner ID: 1542028462154317907)
  WHITELIST_USERS: [
    '1542028462154317907',
    ...(process.env.WHITELIST_USERS || '').split(',').map(s => s.trim()).filter(Boolean)
  ],
  WHITELIST_ROLES: (process.env.WHITELIST_ROLES || '').split(',').map(s => s.trim()).filter(Boolean),

  // Lavalink Cluster Nodes (Supports multiple public / private nodes with auto-failover)
  LAVALINK_NODES: [
    {
      name: 'Public-Node-1-US',
      url: process.env.LAVALINK_HOST_1 || 'lava-v4.ajieblogs.eu.org:443',
      auth: process.env.LAVALINK_PASS_1 || 'https://dsc.gg/ajidevserver',
      secure: true
    },
    {
      name: 'Public-Node-2-EU',
      url: process.env.LAVALINK_HOST_2 || 'lavalink.serenetia.com:443',
      auth: process.env.LAVALINK_PASS_2 || 'youshallnotpass',
      secure: true
    },
    {
      name: 'Public-Node-3-SG',
      url: process.env.LAVALINK_HOST_3 || 'node1.inrl.in:443',
      auth: process.env.LAVALINK_PASS_3 || 'inrl',
      secure: true
    }
  ]
};
`
  },
  {
    path: 'src/systems/antiRaid.ts',
    name: 'antiRaid.ts',
    category: 'protection',
    description: 'Sliding window anti-nuke engine, auto-quarantine, permission stripping, and audit log analysis.',
    content: `import {
  Client,
  Guild,
  GuildAuditLogsEntry,
  AuditLogEvent,
  GuildChannel,
  Role,
  GuildMember,
  ChannelType,
  PermissionsBitField,
  EmbedBuilder,
  TextChannel
} from 'discord.js';
import { CONFIG } from '../config';

interface ActionRecord {
  timestamps: number[];
}

export class AntiRaidManager {
  private client: Client;
  // Map<GuildId:UserId:ActionType, ActionRecord>
  private actionTracker = new Map<string, ActionRecord>();
  // Cached channel snapshots for instant restoration
  private channelBackups = new Map<string, any>();

  constructor(client: Client) {
    this.client = client;
  }

  private isWhitelisted(guild: Guild, userId: string, member?: GuildMember | null): boolean {
    if (userId === guild.ownerId) return true;
    if (userId === CONFIG.OWNER_ID) return true;
    if (CONFIG.WHITELIST_USERS.includes(userId)) return true;
    if (member) {
      for (const roleId of CONFIG.WHITELIST_ROLES) {
        if (member.roles.cache.has(roleId)) return true;
      }
    }
    return false;
  }

  private recordAction(key: string, windowSeconds: number): number {
    const now = Date.now();
    const record = this.actionTracker.get(key) || { timestamps: [] };
    // Filter out timestamps outside window
    record.timestamps = record.timestamps.filter(t => now - t <= windowSeconds * 1000);
    record.timestamps.push(now);
    this.actionTracker.set(key, record);
    return record.timestamps.length;
  }

  /**
   * Strips all dangerous administrative permissions and quarantines the rogue actor
   */
  public async quarantineActor(guild: Guild, actorId: string, reason: string): Promise<void> {
    try {
      const member = await guild.members.fetch(actorId).catch(() => null);
      if (!member) return;

      // Ensure bot does not try to quarantine guild owner or higher role
      if (member.id === guild.ownerId || !member.manageable) {
        console.warn(\`[Anti-Raid] Cannot quarantine \${member.user.tag} (Higher role or Owner)\`);
        return;
      }

      // 1. Strip all roles that grant ADMIN / MANAGE permissions
      const rolesToRemove = member.roles.cache.filter(role => 
        role.id !== guild.id && // Don't remove @everyone
        (role.permissions.has(PermissionsBitField.Flags.Administrator) ||
         role.permissions.has(PermissionsBitField.Flags.ManageGuild) ||
         role.permissions.has(PermissionsBitField.Flags.ManageChannels) ||
         role.permissions.has(PermissionsBitField.Flags.ManageRoles) ||
         role.permissions.has(PermissionsBitField.Flags.BanMembers) ||
         role.permissions.has(PermissionsBitField.Flags.KickMembers))
      );

      if (rolesToRemove.size > 0) {
        await member.roles.remove(rolesToRemove, \`[Aegis Anti-Raid] \${reason}\`);
      }

      // 2. Assign Quarantine Role
      let quarantineRole = guild.roles.cache.find(r => r.name === CONFIG.ANTI_RAID.QUARANTINE_ROLE_NAME);
      if (!quarantineRole) {
        quarantineRole = await guild.roles.create({
          name: CONFIG.ANTI_RAID.QUARANTINE_ROLE_NAME,
          color: 0x2f3136,
          permissions: [],
          reason: 'Tự động tạo Role cách ly Anti-Raid'
        });

        // Set channel overrides for all channels
        for (const [, channel] of guild.channels.cache) {
          if ('permissionOverwrites' in channel) {
            await (channel as GuildChannel).permissionOverwrites.create(quarantineRole, {
              ViewChannel: false,
              SendMessages: false,
              Connect: false
            }).catch(() => null);
          }
        }
      }

      await member.roles.add(quarantineRole, \`[Aegis Quarantine] \${reason}\`);
      await member.timeout(24 * 60 * 60 * 1000, \`[Aegis Anti-Raid Timeout] \${reason}\`).catch(() => null);

      // 3. Log alert to security channel
      await this.sendAlert(guild, {
        title: '🚨 PHÁT HIỆN TẤN CÔNG & ĐÃ CÁCH LY THÀNH CÔNG',
        description: \`**Đối tượng:** <@\${member.id}> (\${member.user.tag} - ID: \`\`\${member.id}\`\`)\\n**Lý do:** \${reason}\\n**Biện pháp:** Tước quyền Admin, thêm role Cách ly, Timeout 24h.\`,
        color: 0xff0033
      });
    } catch (err) {
      console.error('[Anti-Raid] Error quarantining actor:', err);
    }
  }

  public async handleChannelDelete(channel: any): Promise<void> {
    const guild = channel.guild;
    if (!guild) return;

    // Cache channel snapshot for recovery
    this.channelBackups.set(channel.id, {
      name: channel.name,
      type: channel.type,
      parentId: channel.parentId,
      position: channel.rawPosition,
      permissionOverwrites: channel.permissionOverwrites?.cache?.map((po: any) => ({
        id: po.id,
        type: po.type,
        allow: po.allow.bitfield.toString(),
        deny: po.deny.bitfield.toString()
      }))
    });

    const auditLogs = await guild.fetchAuditLogs({
      limit: 1,
      type: AuditLogEvent.ChannelDelete
    }).catch(() => null);

    const entry = auditLogs?.entries.first();
    if (!entry || !entry.executor) return;

    const actor = entry.executor;
    if (this.isWhitelisted(guild, actor.id)) return;

    const key = \`\${guild.id}:\${actor.id}:CHANNEL_DELETE\`;
    const count = this.recordAction(key, CONFIG.ANTI_RAID.WINDOW_SECONDS);

    if (count >= CONFIG.ANTI_RAID.MAX_CHANNEL_DELETES) {
      await this.quarantineActor(guild, actor.id, \`Xóa \${count} kênh trong \${CONFIG.ANTI_RAID.WINDOW_SECONDS}s (Vượt ngưỡng Anti-Nuke)\`);

      // Auto restore channel if configured
      if (CONFIG.ANTI_RAID.AUTO_RESTORE) {
        const backup = this.channelBackups.get(channel.id);
        if (backup) {
          await guild.channels.create({
            name: backup.name,
            type: backup.type,
            parent: backup.parentId,
            position: backup.position,
            reason: '[Aegis Auto-Restore] Khôi phục kênh bị xóa do tấn công'
          }).catch(console.error);
        }
      }
    }
  }

  public async handleRoleDelete(role: Role): Promise<void> {
    const guild = role.guild;
    const auditLogs = await guild.fetchAuditLogs({
      limit: 1,
      type: AuditLogEvent.RoleDelete
    }).catch(() => null);

    const entry = auditLogs?.entries.first();
    if (!entry || !entry.executor) return;

    const actor = entry.executor;
    if (this.isWhitelisted(guild, actor.id)) return;

    const key = \`\${guild.id}:\${actor.id}:ROLE_DELETE\`;
    const count = this.recordAction(key, CONFIG.ANTI_RAID.WINDOW_SECONDS);

    if (count >= CONFIG.ANTI_RAID.MAX_ROLE_DELETES) {
      await this.quarantineActor(guild, actor.id, \`Xóa \${count} vai trò trong \${CONFIG.ANTI_RAID.WINDOW_SECONDS}s (Anti-Nuke Trigger)\`);
    }
  }

  public async handleBanAdd(ban: any): Promise<void> {
    const guild = ban.guild;
    const auditLogs = await guild.fetchAuditLogs({
      limit: 1,
      type: AuditLogEvent.MemberBanAdd
    }).catch(() => null);

    const entry = auditLogs?.entries.first();
    if (!entry || !entry.executor) return;

    const actor = entry.executor;
    if (this.isWhitelisted(guild, actor.id)) return;

    const key = \`\${guild.id}:\${actor.id}:MASS_BAN\`;
    const count = this.recordAction(key, CONFIG.ANTI_RAID.WINDOW_SECONDS);

    if (count >= CONFIG.ANTI_RAID.MAX_BANS) {
      await this.quarantineActor(guild, actor.id, \`Ban hàng loạt \${count} thành viên trong \${CONFIG.ANTI_RAID.WINDOW_SECONDS}s (Mass Ban Trigger)\`);
    }
  }

  public async handleMemberKick(member: any): Promise<void> {
    const guild = member.guild;
    const auditLogs = await guild.fetchAuditLogs({
      limit: 1,
      type: AuditLogEvent.MemberKick
    }).catch(() => null);

    const entry = auditLogs?.entries.first();
    if (!entry || !entry.executor) return;

    const actor = entry.executor;
    if (this.isWhitelisted(guild, actor.id)) return;

    const key = \`\${guild.id}:\${actor.id}:MASS_KICK\`;
    const count = this.recordAction(key, CONFIG.ANTI_RAID.WINDOW_SECONDS);

    if (count >= CONFIG.ANTI_RAID.MAX_KICKS) {
      await this.quarantineActor(guild, actor.id, \`Kick hàng loạt \${count} thành viên trong \${CONFIG.ANTI_RAID.WINDOW_SECONDS}s (Mass Kick Trigger)\`);
    }
  }

  public async handleMemberJoin(member: GuildMember): Promise<void> {
    // Block unauthorized rogue bots
    if (member.user.bot && CONFIG.ANTI_RAID.BLOCK_UNAUTHORIZED_BOTS) {
      const auditLogs = await member.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.BotAdd
      }).catch(() => null);

      const entry = auditLogs?.entries.first();
      const adder = entry?.executor;

      if (!adder || !this.isWhitelisted(member.guild, adder.id)) {
        await member.kick('[Aegis Anti-Bot] Bot chưa được whitelist bởi Owner/Admin').catch(console.error);
        if (adder) {
          await this.sendAlert(member.guild, {
            title: '⚠️ CHẶN BOT LẠ THAM GIA SERVER',
            description: \`Bot <@\${member.id}> vừa bị đá tự động do được thêm bởi tài khoản không được ủy quyền: <@\${adder.id}>\`,
            color: 0xffaa00
          });
        }
      }
    }
  }

  private async sendAlert(guild: Guild, data: { title: string; description: string; color: number }) {
    const logChannel = CONFIG.LOG_CHANNEL_ID 
      ? (guild.channels.cache.get(CONFIG.LOG_CHANNEL_ID) as TextChannel)
      : (guild.systemChannel as TextChannel);

    if (!logChannel || !('send' in logChannel)) return;

    const embed = new EmbedBuilder()
      .setTitle(data.title)
      .setDescription(data.description)
      .setColor(data.color)
      .setTimestamp();

    await logChannel.send({ embeds: [embed] }).catch(() => null);
  }
}
`
  },
  {
    path: 'src/systems/antiSpam.ts',
    name: 'antiSpam.ts',
    category: 'protection',
    description: 'Smart Anti-Spam engine with Levenshtein duplicate detection, fast-typing discernment, and rate-limiting.',
    content: `import { Message, PermissionsBitField, EmbedBuilder } from 'discord.js';
import { CONFIG } from '../config';

interface UserMessageData {
  messages: { content: string; timestamp: number }[];
  warnCount: number;
}

export class AntiSpamManager {
  private userHistory = new Map<string, UserMessageData>();

  constructor(private client: any) {}

  public async handleMessage(message: Message): Promise<void> {
    const member = message.member;
    const author = message.author;
    if (!member || author.bot) return;

    // Ignore Administrator or Whitelisted members
    if (member.permissions.has(PermissionsBitField.Flags.Administrator) ||
        CONFIG.WHITELIST_USERS.includes(author.id)) {
      return;
    }

    const now = Date.now();
    const userId = author.id;
    const userData = this.userHistory.get(userId) || { messages: [], warnCount: 0 };

    // 1. Phishing & Discord Invite Detection
    const inviteRegex = /(?:https?:\/\/)?(?:www\.)?(?:discord\.(?:gg|io|me|li)|discord(?:app)?\.com\/invite)\/([a-zA-Z0-9-]{2,32})/i;
    const phishingRegex = /(?:steamcommunit[yu]\.com|discord-nitro|dlscord\.com|free-nitro)/i;

    if (CONFIG.ANTI_SPAM.BLOCK_PHISHING && phishingRegex.test(message.content)) {
      await message.delete().catch(() => null);
      await member.timeout(60 * 60 * 1000, '[Aegis Anti-Phishing] Phát hiện liên kết Scam/Phishing').catch(() => null);
      await message.channel.send({
        content: \`🛡️ Đã xóa link lừa đảo độc hại từ <@\${author.id}> và timeout 1 giờ.\`
      }).then(m => setTimeout(() => m.delete().catch(() => null), 5000));
      return;
    }

    if (CONFIG.ANTI_SPAM.BLOCK_INVITES && inviteRegex.test(message.content)) {
      await message.delete().catch(() => null);
      await message.channel.send({
        content: \`⚠️ <@\${author.id}>: Không được gửi liên kết mời tham gia Discord khác!\`
      }).then(m => setTimeout(() => m.delete().catch(() => null), 4000));
      return;
    }

    // 2. Mention Spam Check
    const mentionsCount = message.mentions.users.size + message.mentions.roles.size + (message.mentions.everyone ? 1 : 0);
    if (mentionsCount >= CONFIG.ANTI_SPAM.MAX_MENTIONS) {
      await message.delete().catch(() => null);
      await member.timeout(15 * 60 * 1000, '[Aegis Anti-Spam] Gắn thẻ quá nhiều người').catch(() => null);
      await message.channel.send({
        content: \`🚨 <@\${author.id}> đã bị timeout 15 phút do gắn thẻ hàng loạt (\${mentionsCount} mentions).\`
      }).then(m => setTimeout(() => m.delete().catch(() => null), 6000));
      return;
    }

    // Clean old records outside interval
    userData.messages = userData.messages.filter(m => now - m.timestamp <= CONFIG.ANTI_SPAM.INTERVAL_MS);

    // Calculate time since last message
    const lastMsg = userData.messages[userData.messages.length - 1];
    const deltaMs = lastMsg ? now - lastMsg.timestamp : 999999;

    // Check similarity with previous messages
    let isDuplicateSpam = false;
    for (const past of userData.messages) {
      const sim = this.calculateSimilarity(message.content.trim().toLowerCase(), past.content.trim().toLowerCase());
      if (sim * 100 >= CONFIG.ANTI_SPAM.SIMILARITY_PERCENT) {
        isDuplicateSpam = true;
        break;
      }
    }

    userData.messages.push({ content: message.content, timestamp: now });
    this.userHistory.set(userId, userData);

    // Evaluate: Rapid Human Typing vs Bot/Macro Spam
    if (userData.messages.length >= CONFIG.ANTI_SPAM.MAX_MESSAGES) {
      if (isDuplicateSpam) {
        // High rate + identical text = definitely spam
        await message.delete().catch(() => null);
        userData.warnCount++;

        if (userData.warnCount >= 2 || deltaMs < 250) {
          // Raid flood timeout
          await member.timeout(10 * 60 * 1000, '[Aegis Anti-Spam] Spam lặp tin nhắn liên tục tốc độ cao').catch(() => null);
          await message.channel.send({
            content: \`🛑 <@\${author.id}> bị timeout 10 phút do spam lặp nội dung liên tục.\`
          }).then(m => setTimeout(() => m.delete().catch(() => null), 5000));
        } else {
          await message.channel.send({
            content: \`⚠️ <@\${author.id}>: Vui lòng không spam lặp tin nhắn giống nhau!\`
          }).then(m => setTimeout(() => m.delete().catch(() => null), 4000));
        }
      } else {
        // Different text - check if it's natural fast human typing
        if (deltaMs >= CONFIG.ANTI_SPAM.FAST_TYPING_GRACE_MS && message.content.length > 5) {
          // Human gõ nhanh tự nhiên -> Cho phép, chỉ nhắc nhở nhẹ nếu vượt quá nhiều
          if (userData.messages.length > CONFIG.ANTI_SPAM.MAX_MESSAGES + 2) {
            await message.channel.send({
              content: \`💬 <@\${author.id}>: Bạn đang gõ rất nhanh, hãy chậm lại một chút để tránh kích hoạt bộ lọc nhé!\`
            }).then(m => setTimeout(() => m.delete().catch(() => null), 3500));
          }
        } else if (deltaMs < 150) {
          // Tốc độ < 150ms giữa các tin nhắn là macro hoặc tool flood
          await message.delete().catch(() => null);
          await member.timeout(5 * 60 * 1000, '[Aegis Anti-Spam] Macro flood speed').catch(() => null);
        }
      }
    }
  }

  private calculateSimilarity(a: string, b: string): number {
    if (a === b) return 1.0;
    if (!a.length || !b.length) return 0.0;
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return 1.0 - matrix[b.length][a.length] / Math.max(a.length, b.length);
  }
}
`
  },
  {
    path: 'src/systems/musicManager.ts',
    name: 'musicManager.ts',
    category: 'music',
    description: 'Lavalink Music Engine with failover nodes, YouTube/SoundCloud/MP3 support, loop modes, and single-embed UI updater with zero message spam.',
    content: `import {
  Client,
  TextChannel,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Message
} from 'discord.js';
import { Shoukaku, Player } from 'shoukaku';

export type LoopMode = 'off' | 'track' | 'queue';

export interface GuildQueue {
  guildId: string;
  textChannel: TextChannel;
  voiceChannelId: string;
  player: Player;
  currentTrack: any | null;
  tracks: any[];
  loopMode: LoopMode;
  volume: number;
  controllerMessage: Message | null; // Single persistent controller message (No spam loop!)
}

export class MusicManager {
  private queues = new Map<string, GuildQueue>();

  constructor(private client: Client, private shoukaku: Shoukaku) {}

  public getQueue(guildId: string): GuildQueue | undefined {
    return this.queues.get(guildId);
  }

  /**
   * Search tracks across YouTube, SoundCloud, or Direct MP3 streams
   */
  public async search(query: string, engine: 'ytsearch' | 'scsearch' | 'direct' = 'ytsearch') {
    // Pick the most optimal available node
    const node = this.shoukaku.options.nodeResolver(this.shoukaku.nodes);
    if (!node) throw new Error('Không tìm thấy Lavalink node nào khả dụng. Vui lòng kiểm tra lại node status.');

    let searchIdentifier = query;
    if (!query.startsWith('http://') && !query.startsWith('https://')) {
      searchIdentifier = \`\${engine}:\${query}\`;
    }

    const result = await node.rest.resolve(searchIdentifier);
    return result;
  }

  /**
   * Connect to voice channel and enqueue or play track
   */
  public async play(
    guildId: string,
    voiceChannelId: string,
    textChannel: TextChannel,
    track: any,
    requester: any
  ): Promise<void> {
    let queue = this.queues.get(guildId);

    if (!queue) {
      // Connect to voice channel via Shoukaku
      const player = await this.shoukaku.joinVoiceChannel({
        guildId,
        channelId: voiceChannelId,
        shardId: 0,
        deaf: true
      });

      queue = {
        guildId,
        textChannel,
        voiceChannelId,
        player,
        currentTrack: null,
        tracks: [],
        loopMode: 'off',
        volume: 75,
        controllerMessage: null
      };

      this.queues.set(guildId, queue);

      // Attach player lifecycle listeners
      player.on('end', () => this.handleTrackEnd(guildId));
      player.on('exception', (err) => {
        console.error(\`[Player Exception \${guildId}]:\`, err);
        this.handleTrackEnd(guildId);
      });
      player.on('closed', () => {
        this.destroy(guildId);
      });
    }

    track.requester = requester;

    if (!queue.currentTrack) {
      queue.currentTrack = track;
      await this.startPlayback(queue);
    } else {
      queue.tracks.push(track);
      // Quietly confirm without spamming permanent chat messages
      const reply = await textChannel.send({
        content: \`🎵 Đã thêm vào hàng chờ: **\${track.info.title}** (Vị trí #\${queue.tracks.length})\`
      });
      setTimeout(() => reply.delete().catch(() => null), 5000);
      await this.updateController(queue);
    }
  }

  private async startPlayback(queue: GuildQueue): Promise<void> {
    if (!queue.currentTrack) return;
    await queue.player.playTrack({ track: { encoded: queue.currentTrack.encoded } });
    await this.updateController(queue);
  }

  private async handleTrackEnd(guildId: string): Promise<void> {
    const queue = this.queues.get(guildId);
    if (!queue) return;

    if (queue.loopMode === 'track' && queue.currentTrack) {
      // Replay same track
      await this.startPlayback(queue);
      return;
    }

    if (queue.loopMode === 'queue' && queue.currentTrack) {
      // Push finished track back to tail
      queue.tracks.push(queue.currentTrack);
    }

    if (queue.tracks.length > 0) {
      queue.currentTrack = queue.tracks.shift();
      await this.startPlayback(queue);
    } else {
      queue.currentTrack = null;
      if (queue.controllerMessage) {
        await queue.controllerMessage.delete().catch(() => null);
        queue.controllerMessage = null;
      }
      const finishMsg = await queue.textChannel.send('✅ Hàng chờ đã kết thúc. Rời phòng sau 3 phút nếu không có bài mới.');
      setTimeout(() => finishMsg.delete().catch(() => null), 6000);
    }
  }

  public skip(guildId: string): boolean {
    const queue = this.queues.get(guildId);
    if (!queue || !queue.currentTrack) return false;
    queue.player.stopTrack();
    return true;
  }

  public setLoop(guildId: string, mode: LoopMode): LoopMode {
    const queue = this.queues.get(guildId);
    if (!queue) return 'off';
    queue.loopMode = mode;
    this.updateController(queue);
    return mode;
  }

  public setVolume(guildId: string, volume: number): number {
    const queue = this.queues.get(guildId);
    if (!queue) return 75;
    const clamped = Math.max(1, Math.min(150, volume));
    queue.volume = clamped;
    queue.player.setGlobalVolume(clamped);
    this.updateController(queue);
    return clamped;
  }

  public destroy(guildId: string): void {
    const queue = this.queues.get(guildId);
    if (queue) {
      if (queue.controllerMessage) {
        queue.controllerMessage.delete().catch(() => null);
      }
      this.shoukaku.leaveVoiceChannel(guildId);
      this.queues.delete(guildId);
    }
  }

  /**
   * CRITICAL: Updates or creates ONE persistent controller message with interactive buttons
   * This completely eradicates chat spam and looping message spam!
   */
  public async updateController(queue: GuildQueue): Promise<void> {
    if (!queue.currentTrack) return;

    const track = queue.currentTrack;
    const duration = this.formatDuration(track.info.length);
    const loopLabel = queue.loopMode === 'track' ? '🔂 Bài hiện tại' : queue.loopMode === 'queue' ? '🔁 Toàn hàng chờ' : '➡️ Tắt';

    const embed = new EmbedBuilder()
      .setTitle('💿 ĐANG PHÁT NHẠC (LAVALINK HIGH-FIDELITY)')
      .setDescription(\`**[\${track.info.title}](\${track.info.uri})**\\n\\n**Tác giả:** \${track.info.author} · **Thời lượng:** \`\`\${duration}\`\`\\n**Yêu cầu bởi:** <@\${track.requester.id}> · **Lặp lại:** \`\`\${loopLabel}\`\` · **Âm lượng:** \`\`\${queue.volume}%\`\`\\n**Hàng chờ tiếp theo:** \`\`\${queue.tracks.length} bài\`\`\`)
      .setColor(0x5865f2)
      .setThumbnail(track.info.artworkUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=300&q=80')
      .setFooter({ text: 'AegisCore Lavalink v4 Engine · Single-Controller Mode' });

    const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('music_toggle_pause')
        .setLabel(queue.player.paused ? '▶️ Tiếp tục' : '⏸️ Tạm dừng')
        .setStyle(queue.player.paused ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('music_skip')
        .setLabel('⏭️ Bỏ qua')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('music_loop_toggle')
        .setLabel(\`🔁 Loop: \${queue.loopMode.toUpperCase()}\`)
        .setStyle(queue.loopMode !== 'off' ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('music_stop')
        .setLabel('⏹️ Dừng phát')
        .setStyle(ButtonStyle.Danger)
    );

    const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('music_vol_down')
        .setLabel('🔉 Giảm Vol')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('music_vol_up')
        .setLabel('🔊 Tăng Vol')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('music_view_queue')
        .setLabel('📜 Danh sách chờ')
        .setStyle(ButtonStyle.Secondary)
    );

    try {
      if (queue.controllerMessage) {
        // Edit existing message, avoiding chat spam
        await queue.controllerMessage.edit({ embeds: [embed], components: [row1, row2] });
      } else {
        queue.controllerMessage = await queue.textChannel.send({ embeds: [embed], components: [row1, row2] });
      }
    } catch {
      // If message was manually deleted by someone, send a new one
      queue.controllerMessage = await queue.textChannel.send({ embeds: [embed], components: [row1, row2] }).catch(() => null);
    }
  }

  private formatDuration(ms: number): string {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return \`\${mins}:\${secs < 10 ? '0' : ''}\${secs}\`;
  }
}
`
  },
  {
    path: 'src/commands/music.ts',
    name: 'music.ts',
    category: 'commands',
    description: 'Slash commands for music (/play, /skip, /queue, /loop, /volume, /stop) and persistent button interaction handling.',
    content: `import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ButtonInteraction,
  GuildMember,
  EmbedBuilder
} from 'discord.js';
import { musicManager } from '../index';

export const musicCommands = [
  {
    data: new SlashCommandBuilder()
      .setName('play')
      .setDescription('Phát nhạc từ YouTube, SoundCloud hoặc link MP3 trực tiếp')
      .addStringOption(opt =>
        opt.setName('query')
          .setDescription('Tên bài hát, từ khóa tìm kiếm hoặc link YouTube/SoundCloud/MP3')
          .setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('source')
          .setDescription('Nguồn tìm kiếm (mặc định YouTube)')
          .addChoices(
            { name: 'YouTube', value: 'ytsearch' },
            { name: 'SoundCloud', value: 'scsearch' }
          )
      ),
    async execute(interaction: ChatInputCommandInteraction) {
      await interaction.deferReply({ ephemeral: true });
      const member = interaction.member as GuildMember;
      const voiceChannel = member.voice.channel;

      if (!voiceChannel) {
        return interaction.editReply('❌ Bạn phải vào một kênh thoại (Voice Channel) trước!');
      }

      const query = interaction.options.getString('query', true);
      const source = (interaction.options.getString('source') as any) || 'ytsearch';

      try {
        const result = await musicManager.search(query, source);
        if (!result || !result.data) {
          return interaction.editReply('❌ Không tìm thấy bài hát nào phù hợp.');
        }

        let trackToPlay: any;
        if (result.loadType === 'track') {
          trackToPlay = result.data;
        } else if (result.loadType === 'playlist') {
          trackToPlay = result.data.tracks[0];
        } else if (result.loadType === 'search') {
          trackToPlay = result.data[0];
        }

        if (!trackToPlay) {
          return interaction.editReply('❌ Không thể tải track âm thanh từ nguồn này.');
        }

        await musicManager.play(
          interaction.guildId!,
          voiceChannel.id,
          interaction.channel as any,
          trackToPlay,
          { id: interaction.user.id, username: interaction.user.username }
        );

        await interaction.editReply(\`✅ Đã xử lý yêu cầu phát: **\${trackToPlay.info.title}**\`);
      } catch (err: any) {
        await interaction.editReply(\`❌ Lỗi phát nhạc: \${err.message}\`);
      }
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('skip')
      .setDescription('Bỏ qua bài hát hiện tại'),
    async execute(interaction: ChatInputCommandInteraction) {
      const skipped = musicManager.skip(interaction.guildId!);
      await interaction.reply({
        content: skipped ? '⏭️ Đã bỏ qua bài hát.' : '❌ Không có bài nào đang phát để bỏ qua.',
        ephemeral: true
      });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('loop')
      .setDescription('Thiết lập chế độ lặp lại')
      .addStringOption(opt =>
        opt.setName('mode')
          .setDescription('Chế độ lặp')
          .setRequired(true)
          .addChoices(
            { name: 'Tắt lặp (Off)', value: 'off' },
            { name: 'Lặp 1 bài (Track)', value: 'track' },
            { name: 'Lặp danh sách (Queue)', value: 'queue' }
          )
      ),
    async execute(interaction: ChatInputCommandInteraction) {
      const mode = interaction.options.getString('mode', true) as any;
      const res = musicManager.setLoop(interaction.guildId!, mode);
      await interaction.reply({
        content: \`🔁 Đã đổi chế độ lặp lại sang: **\${res.toUpperCase()}**\`,
        ephemeral: true
      });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('queue')
      .setDescription('Xem danh sách bài hát đang chờ phát'),
    async execute(interaction: ChatInputCommandInteraction) {
      const queue = musicManager.getQueue(interaction.guildId!);
      if (!queue || !queue.currentTrack) {
        return interaction.reply({ content: '📭 Hàng chờ hiện đang trống.', ephemeral: true });
      }

      const list = queue.tracks.slice(0, 10).map((t, i) => \`\${i + 1}. \${t.info.title} (\${Math.floor(t.info.length / 60000)}m)\`).join('\\n') || 'Không có bài chờ tiếp theo.';

      const embed = new EmbedBuilder()
        .setTitle('📜 DANH SÁCH HÀNG CHỜ')
        .setDescription(\`**Đang phát:** \${queue.currentTrack.info.title}\\n\\n**Tiếp theo:**\\n\${list}\`)
        .setColor(0x5865f2);

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('volume')
      .setDescription('Điều chỉnh âm lượng Lavalink (1 - 150%)')
      .addIntegerOption(opt =>
        opt.setName('percent')
          .setDescription('Mức âm lượng phần trăm (1 - 150)')
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(150)
      ),
    async execute(interaction: ChatInputCommandInteraction) {
      const vol = interaction.options.getInteger('percent', true);
      const newVol = musicManager.setVolume(interaction.guildId!, vol);
      await interaction.reply({
        content: \`🔊 Đã chỉnh âm lượng Lavalink sang: **\${newVol}%**\`,
        ephemeral: true
      });
    }
  }
];

export async function handleMusicButton(interaction: ButtonInteraction) {
  const guildId = interaction.guildId!;
  const queue = musicManager.getQueue(guildId);

  if (!queue) {
    return interaction.reply({ content: '❌ Không có phiên phát nhạc nào đang chạy.', ephemeral: true });
  }

  await interaction.deferUpdate();

  switch (interaction.customId) {
    case 'music_toggle_pause':
      queue.player.setPaused(!queue.player.paused);
      await musicManager.updateController(queue);
      break;
    case 'music_skip':
      musicManager.skip(guildId);
      break;
    case 'music_loop_toggle':
      const nextMode = queue.loopMode === 'off' ? 'track' : queue.loopMode === 'track' ? 'queue' : 'off';
      musicManager.setLoop(guildId, nextMode);
      break;
    case 'music_stop':
      musicManager.destroy(guildId);
      break;
    case 'music_vol_down':
      musicManager.setVolume(guildId, queue.volume - 10);
      break;
    case 'music_vol_up':
      musicManager.setVolume(guildId, queue.volume + 10);
      break;
    case 'music_view_queue':
      const list = queue.tracks.slice(0, 5).map((t, i) => \`\${i + 1}. \${t.info.title}\`).join('\\n') || 'Không có bài kế tiếp.';
      await interaction.followUp({ content: \`📜 Hàng chờ (\${queue.tracks.length} bài):\\n\${list}\`, ephemeral: true });
      break;
  }
}
`
  },
  {
    path: 'src/commands/moderation.ts',
    name: 'moderation.ts',
    category: 'commands',
    description: 'Server management commands (/ban, /kick, /timeout, /purge, /lockdown, /antiraid-status).',
    content: `import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionsBitField,
  TextChannel,
  EmbedBuilder,
  ChannelType,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  GuildMember
} from 'discord.js';
import { CONFIG } from '../config';

export const afkUsers = new Map<string, { reason: string; timestamp: number; originalNickname?: string }>();

export const moderationCommands = [
  {
    data: new SlashCommandBuilder()
      .setName('lockdown')
      .setDescription('Khóa hoặc mở khóa kênh chat trong trường hợp khẩn cấp')
      .addBooleanOption(opt =>
        opt.setName('lock')
          .setDescription('True để khóa kênh, False để mở lại')
          .setRequired(true)
      ),
    async execute(interaction: ChatInputCommandInteraction) {
      if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageChannels)) {
        return interaction.reply({ content: '❌ Bạn không có quyền Manage Channels.', ephemeral: true });
      }

      const lock = interaction.options.getBoolean('lock', true);
      const channel = interaction.channel as TextChannel;

      await channel.permissionOverwrites.edit(interaction.guild!.roles.everyone, {
        SendMessages: !lock
      });

      await interaction.reply({
        content: lock
          ? '🔒 Kênh này đã bị khóa khẩn cấp bởi Quản trị viên (Chế độ phong tỏa).'
          : '🔓 Kênh đã được mở lại cho mọi người trò chuyện.'
      });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('purge')
      .setDescription('Xóa tin nhắn hàng loạt có lọc an toàn')
      .addIntegerOption(opt =>
        opt.setName('amount')
          .setDescription('Số lượng tin nhắn cần xóa (1-100)')
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(100)
      )
      .addUserOption(opt =>
        opt.setName('user')
          .setDescription('Chỉ xóa tin nhắn của người dùng cụ thể')
      ),
    async execute(interaction: ChatInputCommandInteraction) {
      if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageMessages)) {
        return interaction.reply({ content: '❌ Bạn không có quyền Manage Messages.', ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });
      const amount = interaction.options.getInteger('amount', true);
      const targetUser = interaction.options.getUser('user');
      const channel = interaction.channel as TextChannel;

      const messages = await channel.messages.fetch({ limit: amount });
      const filtered = targetUser
        ? messages.filter(m => m.author.id === targetUser.id)
        : messages;

      await channel.bulkDelete(filtered, true);
      await interaction.editReply(\`🧹 Đã dọn dẹp thành công \${filtered.size} tin nhắn.\`);
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('antiraid-status')
      .setDescription('Kiểm tra trạng thái hệ thống bảo vệ Aegis Anti-Raid / Anti-Nuke'),
    async execute(interaction: ChatInputCommandInteraction) {
      const embed = new EmbedBuilder()
        .setTitle('🛡️ HỆ THỐNG BẢO VỆ AEGIS ANTI-RAID ĐANG BẬT')
        .setDescription('Tất cả các cơ chế giám sát nuke và spam đang hoạt động 100% thời gian thực.')
        .addFields(
          { name: 'Kênh bị xóa tối đa', value: \`\${CONFIG.ANTI_RAID.MAX_CHANNEL_DELETES} / \${CONFIG.ANTI_RAID.WINDOW_SECONDS}s\`, inline: true },
          { name: 'Vai trò bị xóa tối đa', value: \`\${CONFIG.ANTI_RAID.MAX_ROLE_DELETES} / \${CONFIG.ANTI_RAID.WINDOW_SECONDS}s\`, inline: true },
          { name: 'Lệnh Ban/Kick tối đa', value: \`\${CONFIG.ANTI_RAID.MAX_BANS} / \${CONFIG.ANTI_RAID.WINDOW_SECONDS}s\`, inline: true },
          { name: 'Tự động cách ly (Quarantine)', value: CONFIG.ANTI_RAID.AUTO_QUARANTINE ? 'BẬT (Khóa quyền Admin)' : 'TẮT', inline: true },
          { name: 'Khôi phục kênh tự động', value: CONFIG.ANTI_RAID.AUTO_RESTORE ? 'BẬT' : 'TẮT', inline: true },
          { name: 'Chặn Bot lạ không kiểm duyệt', value: CONFIG.ANTI_RAID.BLOCK_UNAUTHORIZED_BOTS ? 'BẬT' : 'TẮT', inline: true },
          { name: 'Owner Server ID', value: \`\`\${CONFIG.OWNER_ID}\`\`, inline: true }
        )
        .setColor(0x00cc88)
        .setFooter({ text: 'AegisCore Shield System' });

      await interaction.reply({ embeds: [embed] });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('setup-logs')
      .setDescription('Tự động tạo kênh riêng tư #aegis-security-logs và liên kết nhật ký Anti-Raid'),
    async execute(interaction: ChatInputCommandInteraction) {
      if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator) &&
          interaction.user.id !== CONFIG.OWNER_ID) {
        return interaction.reply({ content: '❌ Chỉ Chủ Server hoặc Quản Trị Viên mới có quyền tạo kênh Log.', ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });
      const guild = interaction.guild!;

      try {
        let category = guild.channels.cache.find(c => c.name === '🛡️ AN NINH AEGIS' && c.type === 4);
        if (!category) {
          category = await guild.channels.create({
            name: '🛡️ AN NINH AEGIS',
            type: 4,
            reason: 'Tạo danh mục an ninh tự động cho AegisCore'
          });
        }

        const logChannel = await guild.channels.create({
          name: 'aegis-security-logs',
          parent: category.id,
          permissionOverwrites: [
            {
              id: guild.roles.everyone.id,
              deny: [PermissionsBitField.Flags.ViewChannel]
            },
            {
              id: guild.members.me!.id,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.EmbedLinks,
                PermissionsBitField.Flags.AttachFiles
              ]
            },
            {
              id: interaction.user.id,
              allow: [PermissionsBitField.Flags.ViewChannel]
            }
          ],
          reason: 'Kênh nhật ký bảo mật độc quyền cho Aegis Anti-Raid'
        });

        CONFIG.LOG_CHANNEL_ID = logChannel.id;

        const welcomeEmbed = new EmbedBuilder()
          .setTitle('🛡️ KÊNH NHẬT KÝ AN NINH ĐÃ THIẾT LẬP THÀNH CÔNG')
          .setDescription('Kênh này được bảo mật riêng tư 100%. Tất cả các sự cố tấn công (Xóa kênh, xóa role, ban bậy, spam bot) sẽ được gửi trực tiếp vào đây kèm thông tin kẻ chủ mưu.')
          .setColor(0x5865f2)
          .setTimestamp();

        await (logChannel as TextChannel).send({ embeds: [welcomeEmbed] });

        await interaction.editReply(\`✅ Đã tự động tạo và kích hoạt kênh log an ninh: <#\${logChannel.id}>!\`);
      } catch (err: any) {
        await interaction.editReply(\`❌ Lỗi tạo kênh: \${err.message}\`);
      }
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('setup-owner-role')
      .setDescription('Bot tạo Role Quyền Riêng Tối Cao (Administrator) và tự động gán cho Chủ Sở Hữu (Owner)')
      .addStringOption(opt =>
        opt.setName('name')
          .setDescription('Tên Role mong muốn (mặc định: 👑 SOVEREIGN OWNER)')
          .setRequired(false)
      )
      .addStringOption(opt =>
        opt.setName('color')
          .setDescription('Màu sắc của Role hiển thị trên bảng thành viên')
          .setRequired(false)
          .addChoices(
            { name: 'Vàng Kim Hoàng Gia (Gold)', value: 'gold' },
            { name: 'Đỏ Rực Quyền Lực (Crimson)', value: 'crimson' },
            { name: 'Tím Huyền Bí (Imperial Purple)', value: 'purple' },
            { name: 'Xanh Neon Tối Tân (Cyber Green)', value: 'green' },
            { name: 'Xanh Băng Thanh Lịch (Cyan Blue)', value: 'cyan' }
          )
      )
      .addUserOption(opt =>
        opt.setName('target')
          .setDescription('Người nhận Role (để trống nếu muốn tự gán cho chính bạn)')
          .setRequired(false)
      ),
    async execute(interaction: ChatInputCommandInteraction) {
      const guild = interaction.guild!;
      const isOwner = interaction.user.id === CONFIG.OWNER_ID || interaction.user.id === guild.ownerId;

      if (!isOwner) {
        return interaction.reply({
          content: '❌ Lệnh này là đặc quyền tối thượng của Chủ Sở Hữu (Server Owner).',
          ephemeral: true
        });
      }

      await interaction.deferReply();

      const roleName = interaction.options.getString('name') || '👑 SOVEREIGN OWNER';
      const colorOption = interaction.options.getString('color') || 'gold';
      const targetUser = interaction.options.getUser('target') || interaction.user;

      const colorMap: Record<string, number> = {
        gold: 0xffd700,
        crimson: 0xff0044,
        purple: 0x9b59b6,
        green: 0x00ff88,
        cyan: 0x00ccff
      };
      const selectedColor = colorMap[colorOption] || 0xffd700;

      try {
        let role = guild.roles.cache.find(r => r.name === roleName);

        if (!role) {
          role = await guild.roles.create({
            name: roleName,
            color: selectedColor,
            hoist: true,
            permissions: [PermissionsBitField.Flags.Administrator],
            mentionable: false,
            reason: \`Cấp Role Quyền Riêng Tối Cao cho Owner (\${interaction.user.tag})\`
          });
        } else {
          await role.edit({
            color: selectedColor,
            hoist: true,
            permissions: [PermissionsBitField.Flags.Administrator]
          });
        }

        const botHighest = guild.members.me?.roles.highest.position || 1;
        if (botHighest > 1) {
          await role.setPosition(botHighest - 1).catch(() => null);
        }

        const targetMember = await guild.members.fetch(targetUser.id);
        await targetMember.roles.add(role, 'Gán Role Quyền Riêng Tối Cao');

        const embed = new EmbedBuilder()
          .setTitle('👑 ĐÃ THIẾT LẬP VÀ GÁN ROLE TỐI CAO THÀNH CÔNG!')
          .setDescription(
            \`Hệ thống AegisCore đã sử dụng thẩm quyền tối cao để khởi tạo và trao quyền!\\n\\n\` +
            \`• **Tên Role:** <@&\${role.id}> (\`\${role.name}\`)\\n\` +
            \`• **Được gán cho:** <@\${targetMember.id}> (\`\${targetMember.user.tag}\`)\\n\` +
            \`• **Quyền hạn nạp sẵn:** \`Administrator 100% (Toàn Quyền Toàn Năng)\`\\n\` +
            \`• **Vị trí hiển thị:** Tách riêng biệt ở nhóm trên cùng (Hoisted)\\n\` +
            \`• **Màu sắc:** \`\${colorOption.toUpperCase()}\`\\n\` +
            \`• **Cơ chế bảo vệ:** 🛡️ Bất khả xâm phạm\`
          )
          .setColor(selectedColor)
          .setThumbnail(targetMember.user.displayAvatarURL())
          .setFooter({ text: 'Aegis Security • Supreme Privilege' })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      } catch (err: any) {
        await interaction.editReply(\`❌ Lỗi cấp quyền: \${err.message}\`);
      }
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('owner-role')
      .setDescription('Tạo Role Quyền Riêng Tối Cao (Administrator) và tự động gán cho Chủ Sở Hữu (Owner)')
      .addStringOption(opt =>
        opt.setName('name')
          .setDescription('Tên Role mong muốn (mặc định: 👑 SOVEREIGN OWNER)')
          .setRequired(false)
      )
      .addStringOption(opt =>
        opt.setName('color')
          .setDescription('Màu sắc của Role hiển thị trên bảng thành viên')
          .setRequired(false)
          .addChoices(
            { name: 'Vàng Kim Hoàng Gia (Gold)', value: 'gold' },
            { name: 'Đỏ Rực Quyền Lực (Crimson)', value: 'crimson' },
            { name: 'Tím Huyền Bí (Imperial Purple)', value: 'purple' },
            { name: 'Xanh Neon Tối Tân (Cyber Green)', value: 'green' },
            { name: 'Xanh Băng Thanh Lịch (Cyan Blue)', value: 'cyan' }
          )
      )
      .addUserOption(opt =>
        opt.setName('target')
          .setDescription('Người nhận Role (để trống nếu muốn tự gán cho chính bạn)')
          .setRequired(false)
      ),
    async execute(interaction: ChatInputCommandInteraction) {
      const guild = interaction.guild!;
      const isOwner = interaction.user.id === CONFIG.OWNER_ID || interaction.user.id === guild.ownerId;

      if (!isOwner) {
        return interaction.reply({
          content: '❌ Lệnh này là đặc quyền tối thượng của Chủ Sở Hữu (Server Owner).',
          ephemeral: true
        });
      }

      await interaction.deferReply();

      const roleName = interaction.options.getString('name') || '👑 SOVEREIGN OWNER';
      const colorOption = interaction.options.getString('color') || 'gold';
      const targetUser = interaction.options.getUser('target') || interaction.user;

      const colorMap: Record<string, number> = {
        gold: 0xffd700,
        crimson: 0xff0044,
        purple: 0x9b59b6,
        green: 0x00ff88,
        cyan: 0x00ccff
      };
      const selectedColor = colorMap[colorOption] || 0xffd700;

      try {
        let role = guild.roles.cache.find(r => r.name === roleName);

        if (!role) {
          role = await guild.roles.create({
            name: roleName,
            color: selectedColor,
            hoist: true,
            permissions: [PermissionsBitField.Flags.Administrator],
            mentionable: false,
            reason: \`Cấp Role Quyền Riêng Tối Cao cho Owner (\${interaction.user.tag})\`
          });
        } else {
          await role.edit({
            color: selectedColor,
            hoist: true,
            permissions: [PermissionsBitField.Flags.Administrator]
          });
        }

        const botHighest = guild.members.me?.roles.highest.position || 1;
        if (botHighest > 1) {
          await role.setPosition(botHighest - 1).catch(() => null);
        }

        const targetMember = await guild.members.fetch(targetUser.id);
        await targetMember.roles.add(role, 'Gán Role Quyền Riêng Tối Cao');

        const embed = new EmbedBuilder()
          .setTitle('👑 ĐÃ THIẾT LẬP VÀ GÁN ROLE TỐI CAO THÀNH CÔNG!')
          .setDescription(
            \`Hệ thống AegisCore đã sử dụng thẩm quyền tối cao để khởi tạo và trao quyền!\\n\\n\` +
            \`• **Tên Role:** <@&\${role.id}> (\`\${role.name}\`)\\n\` +
            \`• **Được gán cho:** <@\${targetMember.id}> (\`\${targetMember.user.tag}\`)\\n\` +
            \`• **Quyền hạn nạp sẵn:** \`Administrator 100% (Toàn Quyền Toàn Năng)\`\\n\` +
            \`• **Vị trí hiển thị:** Tách riêng biệt ở nhóm trên cùng (Hoisted)\\n\` +
            \`• **Màu sắc:** \`\${colorOption.toUpperCase()}\`\\n\` +
            \`• **Cơ chế bảo vệ:** 🛡️ Bất khả xâm phạm\`
          )
          .setColor(selectedColor)
          .setThumbnail(targetMember.user.displayAvatarURL())
          .setFooter({ text: 'Aegis Security • Supreme Privilege' })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      } catch (err: any) {
        await interaction.editReply(\`❌ Lỗi cấp quyền: \${err.message}\`);
      }
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('delete-channel')
      .setDescription('Xóa kênh bất kỳ (Text, Voice hoặc Category) kèm lý do quản trị')
      .addChannelOption(opt =>
        opt.setName('channel')
          .setDescription('Kênh cần xóa (để trống nếu muốn xóa kênh hiện tại)')
          .setRequired(false)
      )
      .addStringOption(opt =>
        opt.setName('reason')
          .setDescription('Lý do xóa kênh')
          .setRequired(false)
      ),
    async execute(interaction: ChatInputCommandInteraction) {
      if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageChannels) &&
          interaction.user.id !== CONFIG.OWNER_ID && interaction.user.id !== interaction.guild!.ownerId) {
        return interaction.reply({ content: '❌ Bạn không có quyền Manage Channels.', ephemeral: true });
      }

      const targetChannel = (interaction.options.getChannel('channel') || interaction.channel) as any;
      const reason = interaction.options.getString('reason') || 'Xóa theo lệnh của Quản trị viên';

      if (!targetChannel) {
        return interaction.reply({ content: '❌ Không xác định được kênh cần xóa.', ephemeral: true });
      }

      const isCurrentChannel = targetChannel.id === interaction.channelId;
      const channelName = targetChannel.name;

      try {
        if (!isCurrentChannel) {
          await targetChannel.delete(\`[Delete-Channel] Bởi \${interaction.user.tag}: \${reason}\`);
          await interaction.reply({
            content: \`🗑️ Đã xóa thành công kênh **#\${channelName}** với lý do: "*\${reason}*".\`,
            ephemeral: true
          });
        } else {
          await interaction.reply({
            content: \`⚠️ Kênh **#\${channelName}** sẽ bị xóa ngay bây giờ theo yêu cầu của bạn...\`
          });
          setTimeout(async () => {
            await targetChannel.delete(\`[Delete-Channel] Bởi \${interaction.user.tag}: \${reason}\`).catch(() => null);
          }, 1500);
        }
      } catch (err: any) {
        if (!interaction.replied) {
          await interaction.reply({ content: \`❌ Lỗi xóa kênh: \${err.message}\`, ephemeral: true });
        }
      }
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('afk')
      .setDescription('Bật trạng thái vắng mặt (AFK) kèm lý do. Bot sẽ tự thông báo khi ai đó tag bạn')
      .addStringOption(opt =>
        opt.setName('reason')
          .setDescription('Lý do vắng mặt / AFK (Ví dụ: Đi ngủ, Bận học, Ăn cơm...)')
          .setRequired(false)
      ),
    async execute(interaction: ChatInputCommandInteraction) {
      const reason = interaction.options.getString('reason') || 'Bận việc / Vắng mặt';
      const userId = interaction.user.id;
      const member = interaction.member as GuildMember;

      let originalNickname = member?.nickname || interaction.user.username;
      afkUsers.set(userId, {
        reason,
        timestamp: Date.now(),
        originalNickname
      });

      if (member && interaction.guild?.members.me?.permissions.has(PermissionsBitField.Flags.ManageNicknames)) {
        if (interaction.guild.ownerId !== userId && interaction.guild.members.me.roles.highest.position > member.roles.highest.position) {
          const newNick = \`[AFK] \${originalNickname}\`.slice(0, 32);
          await member.setNickname(newNick, 'Bật trạng thái AFK').catch(() => null);
        }
      }

      const embed = new EmbedBuilder()
        .setTitle('💤 ĐÃ BẬT TRẠNG THÁI AFK')
        .setDescription(
          \`<@\${userId}> hiện đã bật chế độ vắng mặt (AFK)!\\n\\n\` +
          \`• **Lý do:** "*\${reason}*"\\n\` +
          \`• **Thời gian bắt đầu:** <t:\${Math.floor(Date.now() / 1000)}:R>\\n\\n\` +
          \`📌 *Bot sẽ tự động báo tin cho bất kỳ ai tag bạn, và sẽ tự tắt chế độ AFK khi bạn chat lại vào kênh bất kỳ!*\`
        )
        .setColor(0x95a5a6)
        .setThumbnail(interaction.user.displayAvatarURL())
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('delete-afk-channel')
      .setDescription('Xóa kênh thoại AFK của server và hủy cấu hình AFK')
      .addChannelOption(opt =>
        opt.setName('channel')
          .setDescription('Chọn kênh voice AFK cần xóa')
          .addChannelTypes(ChannelType.GuildVoice)
          .setRequired(false)
      ),
    async execute(interaction: ChatInputCommandInteraction) {
      if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageChannels) &&
          interaction.user.id !== CONFIG.OWNER_ID) {
        return interaction.reply({ content: '❌ Bạn không có quyền Manage Channels.', ephemeral: true });
      }

      const guild = interaction.guild!;
      let targetChannel = interaction.options.getChannel('channel') as any;

      if (!targetChannel) {
        targetChannel = guild.afkChannel || guild.channels.cache.find(
          c => c.type === ChannelType.GuildVoice && c.name.toLowerCase().includes('afk')
        );
      }

      if (!targetChannel) {
        return interaction.reply({ content: '❌ Không tìm thấy kênh AFK nào.', ephemeral: true });
      }

      try {
        const channelName = targetChannel.name;
        if (guild.afkChannelId === targetChannel.id) {
          await guild.setAFKChannel(null, 'Hủy kênh AFK');
        }
        await targetChannel.delete('Xóa kênh AFK');
        await interaction.reply(\`🗑️ Đã xóa thành công kênh AFK: **\${channelName}**\`);
      } catch (err: any) {
        await interaction.reply(\`❌ Lỗi: \${err.message}\`);
      }
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('serverinfo')
      .setDescription('Xem toàn bộ hồ sơ thống kê chi tiết của Máy Chủ'),
    async execute(interaction: ChatInputCommandInteraction) {
      const guild = interaction.guild!;
      const embed = new EmbedBuilder()
        .setTitle(\`🏛️ THÔNG TIN MÁY CHỦ: \${guild.name}\`)
        .setDescription(guild.description || 'Máy chủ được bảo hộ bởi hệ thống AegisCore Shield.')
        .addFields(
          { name: '👑 Chủ Sở Hữu', value: \`<@\${guild.ownerId}>\`, inline: true },
          { name: '🆔 Server ID', value: \`\`\${guild.id}\`\`, inline: true },
          { name: '👥 Thành Viên', value: \`**\${guild.memberCount}** thành viên\`, inline: true },
          { name: '💎 Boost', value: \`Tier \${guild.premiumTier} (\${guild.premiumSubscriptionCount || 0} lần)\`, inline: true }
        )
        .setColor(0x5865f2)
        .setTimestamp();

      if (guild.iconURL()) embed.setThumbnail(guild.iconURL({ size: 1024 })!);
      await interaction.reply({ embeds: [embed] });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('userinfo')
      .setDescription('Xem hồ sơ chi tiết của người dùng')
      .addUserOption(opt =>
        opt.setName('user')
          .setDescription('Chọn thành viên')
          .setRequired(false)
      ),
    async execute(interaction: ChatInputCommandInteraction) {
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const embed = new EmbedBuilder()
        .setTitle(\`👤 HỒ SƠ: \${targetUser.tag}\`)
        .setDescription(
          \`• **ID:** \`\${targetUser.id}\`\\n\` +
          \`• **Loại:** \${targetUser.bot ? '🤖 Bot' : '👤 Người dùng'}\\n\` +
          \`• **Ngày tạo Discord:** <t:\${Math.floor(targetUser.createdTimestamp / 1000)}:R>\`
        )
        .setColor(0x5865f2)
        .setThumbnail(targetUser.displayAvatarURL({ size: 1024 }))
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('help')
      .setDescription('Mở Bảng Điều Khiển Hướng Dẫn Toàn Diện AegisCore kèm Banner & Profile Chủ'),
    async execute(interaction: ChatInputCommandInteraction) {
      const bannerUrl = 'https://i.pinimg.com/originals/20/ff/e4/20ffe419796909feca129d6ab0e846ee.gif';
      const embed = new EmbedBuilder()
        .setTitle('🛡️ TRUNG TÂM ĐIỀU HÀNH AEGISCORE - BẢNG LỆNH TOÀN DIỆN')
        .setDescription(
          'Chào mừng **' + interaction.user.username + '**!\\n\\n' +
          '👑 **Chủ sở hữu hệ thống:** <@' + CONFIG.OWNER_ID + '> (ID: ' + CONFIG.OWNER_ID + ')\\n' +
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
        )
        .addFields(
          {
            name: '🛡️ BẢO MẬT & QUẢN TRỊ SERVER',
            value:
              '• /owner-role [name] [color] [target]: Tạo & gán Role Tối Cao\\n' +
              '• /delete-channel [channel] [reason]: Xóa kênh bất kỳ kèm lý do\\n' +
              '• /afk [reason]: Bật trạng thái AFK có báo tin nhắn\\n' +
              '• /serverinfo: Xem thông tin máy chủ\\n' +
              '• /userinfo [user]: Tra cứu thông tin người dùng\\n' +
              '• /setup-logs: Kích hoạt kênh an ninh private',
            inline: false
          },
          {
            name: '🎵 ÂM NHẠC HI-FI LAVALINK',
            value: '• /play, /pause, /resume, /skip, /stop, /queue, /volume',
            inline: false
          }
        )
        .setImage(bannerUrl)
        .setColor(0x5865f2)
        .setTimestamp();

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel('👑 Profile Chủ Sở Hữu (Discord Link)')
          .setStyle(ButtonStyle.Link)
          .setURL('https://discord.com/users/' + CONFIG.OWNER_ID)
      );

      await interaction.reply({ embeds: [embed], components: [row] });
    }
  }
];
`
  },
  {
    path: 'package.json',
    name: 'package.json',
    category: 'config',
    description: 'NPM package dependencies for the standalone Discord bot.',
    content: `{
  "name": "aegis-antiraid-music-bot",
  "version": "1.0.0",
  "description": "Production Anti-Raid Nuke & Lavalink Music Discord Suite",
  "main": "dist/index.js",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "tsx src/index.ts",
    "dev": "tsx watch src/index.ts"
  },
  "dependencies": {
    "discord.js": "^14.15.3",
    "shoukaku": "^4.0.1",
    "@discordjs/voice": "^0.17.0",
    "dotenv": "^16.4.5"
  },
  "devDependencies": {
    "@types/node": "^20.12.7",
    "tsx": "^4.7.2",
    "typescript": "^5.4.5"
  }
}
`
  },
  {
    path: 'docker-compose.yml',
    name: 'docker-compose.yml',
    category: 'config',
    description: 'Docker Compose orchestration file running both Lavalink v4 audio server and the Aegis Bot.',
    content: `version: '3.8'

services:
  lavalink:
    image: ghcr.io/lavalink-devs/lavalink:4
    container_name: aegis_lavalink
    restart: always
    environment:
      - _JAVA_OPTIONS=-Xmx2G
    volumes:
      - ./application.yml:/opt/Lavalink/application.yml
      - ./plugins/:/opt/Lavalink/plugins/
    ports:
      - "2333:2333"

  aegis_bot:
    build: .
    container_name: aegis_discord_bot
    restart: always
    depends_on:
      - lavalink
    env_file:
      - .env
`
  },
  {
    path: 'application.yml',
    name: 'application.yml',
    category: 'config',
    description: 'Lavalink v4 configuration file with YouTube, SoundCloud, and Local/HTTP audio sources enabled.',
    content: `server:
  port: 2333
  address: 0.0.0.0
  http2:
    enabled: true

lavalink:
  plugins:
    - dependency: "dev.arbjerg.lavalink.libraries.v4:youtube-plugin:1.5.2"
      repository: "https://maven.lavalink.dev/releases"
  server:
    password: "youshallnotpass"
    sources:
      youtube: true
      bandcamp: true
      soundcloud: true
      twitch: true
      vimeo: true
      http: true
      local: false
    filters:
      volume: true
      equalizer: true
      karaoke: true
      timescale: true
      tremolo: true
      vibrato: true
      distortion: true
      rotation: true
      channelMix: true
      lowPass: true
    bufferDurationMs: 400
    frameBufferDurationMs: 5000
    opusEncodingQuality: 10
    resamplingQuality: HIGH
    trackStuckThresholdMs: 10000
    useSeekGhosting: true
    playerUpdateInterval: 5
    youtubeSearchEnabled: true
    soundcloudSearchEnabled: true
    gc-warnings: true

metrics:
  prometheus:
    enabled: false
    endpoint: /metrics

sentry:
  dsn: ""
  environment: ""

logging:
  file:
    path: ./logs/lavalink.log
  level:
    root: INFO
    lavalink: INFO
`
  },
  {
    path: 'render.yaml',
    name: 'render.yaml',
    category: 'config',
    description: 'Render Blueprint configuration for 1-click 24/7 Web Service deployment.',
    content: `services:
  - type: web
    name: aegis-discord-bot
    env: node
    plan: free
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: DISCORD_TOKEN
        sync: false
      - key: CLIENT_ID
        sync: false
      - key: OWNER_ID
        value: "1542028462154317907"
      - key: PORT
        value: "3000"
`
  },
  {
    path: '.env.example',
    name: '.env.example',
    category: 'config',
    description: 'Environment variables template for Discord bot token and Lavalink nodes.',
    content: `# Discord Bot Credentials
DISCORD_TOKEN=YOUR_DISCORD_BOT_TOKEN_HERE
CLIENT_ID=YOUR_DISCORD_APPLICATION_CLIENT_ID
OWNER_ID=1542028462154317907
LOG_CHANNEL_ID=

# Whitelist (Separated by comma)
WHITELIST_USERS=1542028462154317907
WHITELIST_ROLES=

# Anti-Raid Thresholds (Sliding window in seconds)
RAID_WINDOW_SECONDS=10
MAX_CHANNEL_DELETES=2
MAX_ROLE_DELETES=2
MAX_BANS=3
MAX_KICKS=3

# Lavalink Server Configuration (Public or Private)
LAVALINK_HOST_1=lava-v4.ajieblogs.eu.org:443
LAVALINK_PASS_1=https://dsc.gg/ajidevserver

LAVALINK_HOST_2=lavalink.serenetia.com:443
LAVALINK_PASS_2=youshallnotpass

LAVALINK_HOST_3=node1.inrl.in:443
LAVALINK_PASS_3=inrl
`
  }
];
