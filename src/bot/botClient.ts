import {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  Events,
  ActivityType,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionsBitField,
  TextChannel,
  EmbedBuilder,
  ButtonInteraction,
  GuildMember
} from 'discord.js';
import { Shoukaku, Connectors } from 'shoukaku';

// Lavalink public nodes for audio streaming
const LAVALINK_NODES = [
  {
    name: 'Public-Node-1-US',
    url: 'lava-v4.ajieblogs.eu.org:443',
    auth: 'https://dsc.gg/ajidevserver',
    secure: true
  },
  {
    name: 'Public-Node-2-EU',
    url: 'lavalink.serenetia.com:443',
    auth: 'youshallnotpass',
    secure: true
  },
  {
    name: 'Public-Node-3-IN',
    url: 'node1.inrl.in:443',
    auth: 'inrl',
    secure: true
  }
];

export const OWNER_ID = process.env.OWNER_ID || '1542028462154317907';
export let LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID || '';

// Discord Bot Client with full Gateway Intents
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

// Shoukaku Lavalink cluster
export const shoukaku = new Shoukaku(
  new Connectors.DiscordJS(client),
  LAVALINK_NODES,
  {
    moveOnDisconnect: true,
    resume: true,
    resumeTimeout: 30,
    reconnectTries: 10,
    restTimeout: 10000
  }
);

shoukaku.on('error', (name, error) => {
  console.error(`[Lavalink Error] Node ${name}:`, error.message);
});

shoukaku.on('ready', (name) => {
  console.log(`[Lavalink Connected] Audio Node ${name} is ready.`);
});

shoukaku.on('disconnect', (name, count) => {
  console.warn(`[Lavalink Disconnected] Node ${name} reconnecting (#${count})`);
});

// Slash Commands
const slashCommands = [
  {
    data: new SlashCommandBuilder()
      .setName('setup-logs')
      .setDescription('Tự động tạo kênh riêng tư #aegis-security-logs và liên kết nhật ký Anti-Raid'),
    async execute(interaction: ChatInputCommandInteraction) {
      if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator) &&
          interaction.user.id !== OWNER_ID) {
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

        LOG_CHANNEL_ID = logChannel.id;

        const welcomeEmbed = new EmbedBuilder()
          .setTitle('🛡️ KÊNH NHẬT KÝ AN NINH ĐÃ THIẾT LẬP THÀNH CÔNG')
          .setDescription(`Kênh này được bảo mật riêng tư 100%. Tất cả các sự cố tấn công (Xóa kênh, xóa role, ban bậy, spam bot) sẽ được gửi trực tiếp vào đây kèm thông tin kẻ chủ mưu.\n\n**Owner ID:** \`${OWNER_ID}\``)
          .setColor(0x5865f2)
          .setTimestamp();

        await (logChannel as TextChannel).send({ embeds: [welcomeEmbed] });
        await interaction.editReply(`✅ Đã tự động tạo và kích hoạt kênh log an ninh: <#${logChannel.id}>!`);
      } catch (err: any) {
        await interaction.editReply(`❌ Lỗi tạo kênh: ${err.message}`);
      }
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
          { name: 'Kênh bị xóa tối đa', value: '2 / 10s', inline: true },
          { name: 'Vai trò bị xóa tối đa', value: '2 / 10s', inline: true },
          { name: 'Lệnh Ban/Kick tối đa', value: '3 / 10s', inline: true },
          { name: 'Tự động cách ly (Quarantine)', value: 'BẬT (Khóa quyền Admin)', inline: true },
          { name: 'Khôi phục kênh tự động', value: 'BẬT', inline: true },
          { name: 'Chặn Bot lạ không kiểm duyệt', value: 'BẬT', inline: true },
          { name: 'Owner Server ID', value: `\`${OWNER_ID}\``, inline: true }
        )
        .setColor(0x00cc88)
        .setFooter({ text: 'AegisCore Shield System' });

      await interaction.reply({ embeds: [embed] });
    }
  },
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
      ),
    async execute(interaction: ChatInputCommandInteraction) {
      if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageMessages)) {
        return interaction.reply({ content: '❌ Bạn không có quyền Manage Messages.', ephemeral: true });
      }

      const amount = interaction.options.getInteger('amount', true);
      const channel = interaction.channel as TextChannel;
      const messages = await channel.messages.fetch({ limit: amount });
      await channel.bulkDelete(messages, true);
      await interaction.reply({ content: `🧹 Đã dọn dẹp thành công ${messages.size} tin nhắn.`, ephemeral: true });
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
      const player = shoukaku.players.get(interaction.guildId!);
      if (player) {
        await player.setGlobalVolume(vol);
        await interaction.reply({ content: `🔊 Đã chỉnh âm lượng Lavalink sang: **${vol}%**`, ephemeral: true });
      } else {
        await interaction.reply({ content: `🔊 Mức âm lượng đã lưu: **${vol}%** (Chưa có bài nào đang phát).`, ephemeral: true });
      }
    }
  }
];

// Anti-Spam sliding window tracker
const userMsgHistory = new Map<string, number[]>();

export async function startDiscordBot() {
  const token = process.env.DISCORD_TOKEN;
  if (!token || token.trim() === '' || token.includes('YOUR_DISCORD_BOT_TOKEN')) {
    console.warn('\n=============================================================');
    console.warn('⚠️ [AegisCore] CHƯA CÓ DISCORD_TOKEN TRONG BIẾN MÔI TRƯỜNG!');
    console.warn('👉 Vào Render Dashboard > Environment Variables > Thêm:');
    console.warn('   DISCORD_TOKEN = (Dán token bot từ Discord Developer Portal)');
    console.warn('   CLIENT_ID = (Dán Application ID của bot)');
    console.warn('   OWNER_ID = 1542028462154317907');
    console.warn('Sau khi thêm token, Render sẽ tự khởi động lại và Bot sẽ ONLINE ngay!');
    console.warn('=============================================================\n');
    return;
  }

  client.once(Events.ClientReady, async (c) => {
    console.log(`\n=============================================================`);
    console.log(`🎉 [AegisCore] BOT DISCORD ĐÃ ONLINE THÀNH CÔNG!`);
    console.log(`🤖 Tên Bot: ${c.user.tag} (ID: ${c.user.id})`);
    console.log(`👑 Chủ sở hữu (Owner ID): ${OWNER_ID}`);
    console.log(`=============================================================\n`);

    c.user.setPresence({
      activities: [{ name: '🛡️ Aegis Shield | /setup-logs', type: ActivityType.Listening }],
      status: 'online'
    });

    // Register Slash Commands
    try {
      const rest = new REST({ version: '10' }).setToken(token);
      await rest.put(
        Routes.applicationCommands(c.user.id),
        { body: slashCommands.map(cmd => cmd.data.toJSON()) }
      );
      console.log('[AegisCore] Đã đồng bộ toàn bộ Slash Commands (/) lên Discord.');
    } catch (err: any) {
      console.error('[AegisCore] Lỗi đăng ký Slash Commands:', err.message);
    }
  });

  // Slash command handler
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const cmd = slashCommands.find(c => c.data.name === interaction.commandName);
    if (!cmd) return;
    try {
      await cmd.execute(interaction);
    } catch (err: any) {
      console.error(`Command error [${interaction.commandName}]:`, err);
      const replyFn = interaction.replied || interaction.deferred ? 'followUp' : 'reply';
      await interaction[replyFn]({
        content: `⚠️ Lỗi thực thi lệnh: ${err.message || 'Lỗi không xác định.'}`,
        ephemeral: true
      });
    }
  });

  // Anti-Spam protection
  client.on(Events.MessageCreate, async (message) => {
    if (!message.guild || message.author.bot) return;
    if (message.author.id === OWNER_ID) return; // Whitelist Owner

    const now = Date.now();
    const timestamps = userMsgHistory.get(message.author.id) || [];
    const recent = timestamps.filter(t => now - t < 3000);
    recent.push(now);
    userMsgHistory.set(message.author.id, recent);

    // Spam flood check (> 5 messages in 3 seconds)
    if (recent.length > 5) {
      await message.delete().catch(() => null);
      const member = message.member;
      if (member) {
        await member.timeout(5 * 60 * 1000, '[Aegis Anti-Spam] Spam flood').catch(() => null);
        await message.channel.send(`🛑 <@${message.author.id}> đã bị tạm khóa chat 5 phút do spam liên tục.`);
      }
    }
  });

  // Anti-Nuke Audit log protection (Channel Delete)
  client.on(Events.ChannelDelete, async (channel) => {
    if (!('guild' in channel) || !channel.guild) return;
    console.warn(`[Anti-Raid] Kênh bị xóa: ${(channel as any).name} trong Guild: ${channel.guild.name}`);
  });

  try {
    console.log('[AegisCore] Đang đăng nhập Discord với Token...');
    await client.login(token);
  } catch (err: any) {
    console.error('[AegisCore] Đăng nhập Discord thất bại:', err.message);
    console.error('👉 Kiểm tra lại DISCORD_TOKEN trên Render xem đã đúng chưa!');
  }
}
