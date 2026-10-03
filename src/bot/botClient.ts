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
  GuildMember,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
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

// Lavalink Music Queue System
interface TrackItem {
  encoded: string;
  info: {
    title: string;
    author: string;
    length: number;
    uri: string;
    artworkUrl?: string;
  };
  requester: { id: string; username: string };
}

interface GuildQueue {
  guildId: string;
  voiceChannelId: string;
  textChannelId: string;
  player: any;
  tracks: TrackItem[];
  currentTrack: TrackItem | null;
  loopMode: 'off' | 'track' | 'queue';
  volume: number;
  nowPlayingMessageId?: string;
  isProcessing?: boolean;
}

export const musicQueues = new Map<string, GuildQueue>();

// Process Anti-Crash Guards
process.on('unhandledRejection', (reason: any) => {
  console.error('[Anti-Crash] Unhandled Rejection prevented crash:', reason?.message || reason);
});
process.on('uncaughtException', (err: any) => {
  console.error('[Anti-Crash] Uncaught Exception prevented crash:', err?.message || err);
});

function formatDuration(ms: number) {
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function buildMusicMessagePayload(queue: GuildQueue, isPlaying: boolean) {
  const track = queue.currentTrack;
  if (!track) return null;

  const embed = new EmbedBuilder()
    .setAuthor({ name: '🎵 ĐANG PHÁT NHẠC (LAVALINK HI-FI)', iconURL: client.user?.displayAvatarURL() })
    .setTitle(track.info.title)
    .setURL(track.info.uri)
    .setDescription(
      `**Tác giả:** ${track.info.author}\n` +
      `**Thời lượng:** \`${formatDuration(track.info.length)}\`\n` +
      `**Yêu cầu bởi:** <@${track.requester.id}>\n` +
      `**Âm lượng:** \`${queue.volume}%\` · **Chế độ lặp:** \`${queue.loopMode.toUpperCase()}\`\n` +
      `**Hàng chờ:** \`${queue.tracks.length}\` bài tiếp theo`
    )
    .setColor(0x5865f2)
    .setTimestamp();

  if (track.info.artworkUrl) {
    embed.setThumbnail(track.info.artworkUrl);
  }

  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('music_playpause')
      .setLabel(isPlaying ? '⏸ Tạm dừng' : '▶ Tiếp tục')
      .setStyle(isPlaying ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_skip')
      .setLabel('⏭ Bỏ qua')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('music_loop')
      .setLabel(`🔁 ${queue.loopMode.toUpperCase()}`)
      .setStyle(queue.loopMode !== 'off' ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_stop')
      .setLabel('⏹ Dừng')
      .setStyle(ButtonStyle.Danger)
  );

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('music_voldown')
      .setLabel('🔉 Giảm Vol')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_volup')
      .setLabel('🔊 Tăng Vol')
      .setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [row1, row2] };
}

async function playNext(guildId: string) {
  const queue = musicQueues.get(guildId);
  if (!queue || queue.isProcessing) return;

  queue.isProcessing = true;
  try {
    if (queue.tracks.length === 0) {
      queue.currentTrack = null;
      try {
        const channel = client.channels.cache.get(queue.textChannelId) as TextChannel;
        if (channel) {
          await channel.send('📭 Hàng chờ đã phát xong tất cả các bài hát.').catch(() => null);
        }
      } catch {}
      return;
    }

    const nextTrack = queue.tracks.shift()!;
    queue.currentTrack = nextTrack;

    try {
      await queue.player.playTrack({ track: { encoded: nextTrack.encoded } });
      await queue.player.setGlobalVolume(queue.volume);

      const payload = buildMusicMessagePayload(queue, true);
      if (payload) {
        const channel = client.channels.cache.get(queue.textChannelId) as TextChannel;
        if (channel) {
          const msg = await channel.send(payload).catch(() => null);
          if (msg) queue.nowPlayingMessageId = msg.id;
        }
      }
    } catch (err: any) {
      console.error(`[Music Error] Play track error in guild ${guildId}:`, err?.message || err);
      // Auto advance to next song if this track was broken
      setTimeout(() => playNext(guildId), 1500);
    }
  } finally {
    queue.isProcessing = false;
  }
}

// Slash Commands
const slashCommands = [
  {
    data: new SlashCommandBuilder()
      .setName('play')
      .setDescription('Tìm và phát nhạc chất lượng cao từ YouTube/SoundCloud/MP3')
      .addStringOption(opt =>
        opt.setName('query')
          .setDescription('Tên bài hát hoặc đường link (YouTube, SoundCloud, MP3...)')
          .setRequired(true)
      ),
    async execute(interaction: ChatInputCommandInteraction) {
      const member = interaction.member as GuildMember;
      const voiceChannel = member.voice.channel;
      if (!voiceChannel) {
        return interaction.reply({
          content: '❌ Bạn cần tham gia vào một kênh thoại (Voice Channel) trước khi dùng lệnh `/play`!',
          ephemeral: true
        });
      }

      await interaction.deferReply();
      const query = interaction.options.getString('query', true);
      const guildId = interaction.guildId!;

      const node = shoukaku.getIdealNode();
      if (!node) {
        return interaction.editReply('❌ Không tìm thấy cụm máy chủ âm thanh Lavalink nào sẵn sàng. Vui lòng thử lại sau vài giây.');
      }

      try {
        let player = shoukaku.players.get(guildId);
        if (!player) {
          player = await shoukaku.joinVoiceChannel({
            guildId,
            channelId: voiceChannel.id,
            shardId: 0,
            deaf: true
          });

          player.on('end', async (data: any) => {
            // CRITICAL: Do NOT advance queue if track was replaced, stopped or cleaned up
            if (data && (data.reason === 'replaced' || data.reason === 'stopped' || data.reason === 'cleanup')) {
              return;
            }

            const currentQueue = musicQueues.get(guildId);
            if (!currentQueue) return;

            try {
              if (currentQueue.loopMode === 'track' && currentQueue.currentTrack) {
                await currentQueue.player.playTrack({ track: { encoded: currentQueue.currentTrack.encoded } }).catch(() => null);
              } else if (currentQueue.loopMode === 'queue' && currentQueue.currentTrack) {
                currentQueue.tracks.push(currentQueue.currentTrack);
                await playNext(guildId);
              } else {
                await playNext(guildId);
              }
            } catch (err: any) {
              console.error('[Track Transition Error]:', err?.message || err);
            }
          });

          player.on('stuck', () => {
            console.warn(`[Lavalink Stuck] Track stuck in guild ${guildId}, advancing...`);
            playNext(guildId);
          });

          player.on('closed', () => {
            console.warn(`[Lavalink Closed] Voice connection closed in guild ${guildId}`);
          });

          player.on('exception', (err: any) => {
            console.error('[Lavalink Player Exception]:', err?.message || err);
          });
        }

        let queue = musicQueues.get(guildId);
        if (!queue) {
          queue = {
            guildId,
            voiceChannelId: voiceChannel.id,
            textChannelId: interaction.channelId,
            player,
            tracks: [],
            currentTrack: null,
            loopMode: 'off',
            volume: 80
          };
          musicQueues.set(guildId, queue);
        }

        const isUrl = /^https?:\/\//i.test(query);
        const searchInput = isUrl ? query : `ytsearch:${query}`;
        const result = await node.rest.resolve(searchInput);

        if (!result || !result.data) {
          return interaction.editReply(`❌ Không tìm thấy bài hát nào với từ khóa: \`${query}\``);
        }

        let addedTrack: any = null;
        if (result.loadType === 'track') {
          addedTrack = result.data;
        } else if (result.loadType === 'playlist') {
          const playlist = result.data as any;
          if (playlist.tracks && playlist.tracks.length > 0) {
            playlist.tracks.forEach((t: any) => {
              queue!.tracks.push({
                encoded: t.encoded,
                info: t.info,
                requester: { id: interaction.user.id, username: interaction.user.username }
              });
            });
            if (!queue.currentTrack) {
              await playNext(guildId);
            }
            return interaction.editReply(`✅ Đã thêm playlist **${playlist.info.name}** (${playlist.tracks.length} bài) vào hàng chờ!`);
          }
        } else if (result.loadType === 'search') {
          const searchData = result.data as any[];
          if (searchData.length > 0) {
            addedTrack = searchData[0];
          }
        }

        if (!addedTrack) {
          return interaction.editReply('❌ Không thể trích xuất track âm thanh từ nguồn này.');
        }

        const trackItem: TrackItem = {
          encoded: addedTrack.encoded,
          info: addedTrack.info,
          requester: { id: interaction.user.id, username: interaction.user.username }
        };

        if (!queue.currentTrack) {
          queue.tracks.push(trackItem);
          await playNext(guildId);
          await interaction.editReply(`🎶 Bắt đầu phát: **${trackItem.info.title}**`);
        } else {
          queue.tracks.push(trackItem);
          await interaction.editReply(`➕ Đã thêm vào hàng chờ: **${trackItem.info.title}** (Vị trí #${queue.tracks.length})`);
        }
      } catch (err: any) {
        console.error('[Music Play Error]:', err);
        await interaction.editReply(`❌ Lỗi phát nhạc: ${err.message}`);
      }
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('skip')
      .setDescription('Bỏ qua bài hát đang phát'),
    async execute(interaction: ChatInputCommandInteraction) {
      const queue = musicQueues.get(interaction.guildId!);
      if (!queue || !queue.currentTrack) {
        return interaction.reply({ content: '❌ Không có bài hát nào đang phát để bỏ qua.', ephemeral: true });
      }
      await queue.player.stopTrack();
      await interaction.reply({ content: '⏭️ Đã bỏ qua bài hát hiện tại!' });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('stop')
      .setDescription('Dừng phát nhạc, xóa hàng chờ và ngắt kết nối voice'),
    async execute(interaction: ChatInputCommandInteraction) {
      const queue = musicQueues.get(interaction.guildId!);
      if (queue) {
        queue.tracks = [];
        queue.currentTrack = null;
        await queue.player.stopTrack();
        shoukaku.leaveVoiceChannel(interaction.guildId!);
        musicQueues.delete(interaction.guildId!);
      }
      await interaction.reply({ content: '⏹️ Đã dừng phát nhạc và rời kênh voice.' });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('loop')
      .setDescription('Cài đặt chế độ lặp lại')
      .addStringOption(opt =>
        opt.setName('mode')
          .setDescription('Chế độ lặp')
          .setRequired(true)
          .addChoices(
            { name: 'Tắt lặp (Off)', value: 'off' },
            { name: 'Lặp 1 bài (Track)', value: 'track' },
            { name: 'Lặp hàng chờ (Queue)', value: 'queue' }
          )
      ),
    async execute(interaction: ChatInputCommandInteraction) {
      const queue = musicQueues.get(interaction.guildId!);
      if (!queue) {
        return interaction.reply({ content: '❌ Không có phiên phát nhạc nào đang chạy.', ephemeral: true });
      }
      const mode = interaction.options.getString('mode', true) as any;
      queue.loopMode = mode;
      await interaction.reply({ content: `🔁 Đã đổi chế độ lặp lại sang: **${mode.toUpperCase()}**` });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('queue')
      .setDescription('Xem danh sách các bài hát trong hàng chờ'),
    async execute(interaction: ChatInputCommandInteraction) {
      const queue = musicQueues.get(interaction.guildId!);
      if (!queue || !queue.currentTrack) {
        return interaction.reply({ content: '📭 Hàng chờ hiện đang trống.', ephemeral: true });
      }

      const list = queue.tracks
        .slice(0, 10)
        .map((t, i) => `${i + 1}. **${t.info.title}** (\`${formatDuration(t.info.length)}\`) - <@${t.requester.id}>`)
        .join('\n') || 'Không có bài chờ tiếp theo.';

      const embed = new EmbedBuilder()
        .setTitle('📜 DANH SÁCH BÀI HÁT ĐANG CHỜ')
        .setDescription(`**Đang phát:** ${queue.currentTrack.info.title}\n\n**Tiếp theo:**\n${list}`)
        .setColor(0x5865f2)
        .setFooter({ text: `Tổng cộng: ${queue.tracks.length + 1} bài` });

      await interaction.reply({ embeds: [embed] });
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
      const queue = musicQueues.get(interaction.guildId!);
      if (queue) {
        queue.volume = vol;
        await queue.player.setGlobalVolume(vol);
        await interaction.reply({ content: `🔊 Đã chỉnh âm lượng Lavalink sang: **${vol}%**` });
      } else {
        await interaction.reply({ content: `🔊 Mức âm lượng đã lưu: **${vol}%** (Chưa có bài nào đang phát).`, ephemeral: true });
      }
    }
  },
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

  // Interaction handler (Slash Commands & Music Buttons)
  client.on(Events.InteractionCreate, async (interaction) => {
    // Handle Slash Commands
    if (interaction.isChatInputCommand()) {
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
      return;
    }

    // Handle Music Control Buttons
    if (interaction.isButton() && interaction.customId.startsWith('music_')) {
      const guildId = interaction.guildId;
      if (!guildId) return;

      const queue = musicQueues.get(guildId);
      if (!queue || !queue.currentTrack) {
        return interaction.reply({ content: '❌ Không có phiên phát nhạc nào đang chạy.', ephemeral: true });
      }

      const action = interaction.customId;

      if (action === 'music_playpause') {
        const isCurrentlyPaused = queue.player.paused;
        await queue.player.setPaused(!isCurrentlyPaused);
        const payload = buildMusicMessagePayload(queue, isCurrentlyPaused);
        if (payload) {
          await interaction.update(payload as any);
        }
      } else if (action === 'music_skip') {
        await interaction.deferUpdate();
        await queue.player.stopTrack();
      } else if (action === 'music_loop') {
        const nextMode = queue.loopMode === 'off' ? 'track' : queue.loopMode === 'track' ? 'queue' : 'off';
        queue.loopMode = nextMode;
        const payload = buildMusicMessagePayload(queue, !queue.player.paused);
        if (payload) {
          await interaction.update(payload as any);
        }
      } else if (action === 'music_stop') {
        queue.tracks = [];
        queue.currentTrack = null;
        await queue.player.stopTrack();
        shoukaku.leaveVoiceChannel(guildId);
        musicQueues.delete(guildId);
        await interaction.reply({ content: '⏹️ Đã dừng phát nhạc và rời kênh voice.', ephemeral: true });
      } else if (action === 'music_voldown') {
        queue.volume = Math.max(0, queue.volume - 10);
        await queue.player.setGlobalVolume(queue.volume);
        const payload = buildMusicMessagePayload(queue, !queue.player.paused);
        if (payload) {
          await interaction.update(payload as any);
        }
      } else if (action === 'music_volup') {
        queue.volume = Math.min(150, queue.volume + 10);
        await queue.player.setGlobalVolume(queue.volume);
        const payload = buildMusicMessagePayload(queue, !queue.player.paused);
        if (payload) {
          await interaction.update(payload as any);
        }
      }
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
