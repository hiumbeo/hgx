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
  ButtonStyle,
  AuditLogEvent,
  ChannelType
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

// Mini Games: Blackjack & Caro PVP Engine
interface Card {
  suit: string;
  value: string;
  weight: number;
}
interface BlackjackGame {
  userId: string;
  deck: Card[];
  playerHand: Card[];
  dealerHand: Card[];
  state: 'playing' | 'stand' | 'finished';
}
export const blackjackGames = new Map<string, BlackjackGame>();

function createDeck(): Card[] {
  const suits = ['♠', '♥', '♦', '♣'];
  const values = [
    { name: '2', weight: 2 },
    { name: '3', weight: 3 },
    { name: '4', weight: 4 },
    { name: '5', weight: 5 },
    { name: '6', weight: 6 },
    { name: '7', weight: 7 },
    { name: '8', weight: 8 },
    { name: '9', weight: 9 },
    { name: '10', weight: 10 },
    { name: 'J', weight: 10 },
    { name: 'Q', weight: 10 },
    { name: 'K', weight: 10 },
    { name: 'A', weight: 11 }
  ];
  const deck: Card[] = [];
  for (const suit of suits) {
    for (const val of values) {
      deck.push({ suit, value: val.name, weight: val.weight });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function calculateHandScore(hand: Card[]) {
  let score = 0;
  let aces = 0;
  for (const card of hand) {
    score += card.weight;
    if (card.value === 'A') aces++;
  }
  while (score > 21 && aces > 0) {
    score -= 10;
    aces--;
  }
  return score;
}

function formatHand(hand: Card[], hideSecondCard = false) {
  if (hideSecondCard && hand.length >= 2) {
    return `\`[ ${hand[0].suit} ${hand[0].value} ]\` \`[ 🎴 ?? ]\``;
  }
  return hand.map(c => `\`[ ${c.suit} ${c.value} ]\``).join(' ');
}

// Caro PVP Game State (2 Players Only, No Bot)
interface CaroGame {
  gameId: string;
  guildId: string;
  playerX: string;
  playerO: string;
  turn: 'X' | 'O';
  board: (string | null)[];
  winner: string | null;
}
export const caroGames = new Map<string, CaroGame>();

function checkCaroWinner(board: (string | null)[]) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];
  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  if (board.every(cell => cell !== null)) {
    return 'tie';
  }
  return null;
}

function buildCaroRows(game: CaroGame) {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  for (let r = 0; r < 3; r++) {
    const row = new ActionRowBuilder<ButtonBuilder>();
    for (let c = 0; c < 3; c++) {
      const idx = r * 3 + c;
      const cell = game.board[idx];
      const btn = new ButtonBuilder()
        .setCustomId(`caro_${game.gameId}_${idx}`)
        .setLabel(cell ? (cell === 'X' ? '❌' : '⭕') : '➖')
        .setStyle(
          cell === 'X'
            ? ButtonStyle.Danger
            : cell === 'O'
            ? ButtonStyle.Primary
            : ButtonStyle.Secondary
        )
        .setDisabled(game.winner !== null || cell !== null);
      row.addComponents(btn);
    }
    rows.push(row);
  }
  return rows;
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
  },
  {
    data: new SlashCommandBuilder()
      .setName('delete-afk-channel')
      .setDescription('Xóa kênh thoại AFK của server và hủy cấu hình AFK')
      .addChannelOption(opt =>
        opt.setName('channel')
          .setDescription('Chọn kênh voice AFK cần xóa (để trống nếu muốn bot tự tìm kênh AFK)')
          .addChannelTypes(ChannelType.GuildVoice)
          .setRequired(false)
      ),
    async execute(interaction: ChatInputCommandInteraction) {
      if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageChannels) &&
          interaction.user.id !== OWNER_ID) {
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
        return interaction.reply({
          content: '❌ Không tìm thấy kênh AFK nào được cấu hình trên server hoặc có tên chứa "AFK". Bạn có thể chỉ định rõ kênh bằng tùy chọn `/delete-afk-channel channel: [Kênh Voice]`.',
          ephemeral: true
        });
      }

      try {
        const channelName = targetChannel.name;
        // Reset AFK setting in Guild if it matches
        if (guild.afkChannelId === targetChannel.id) {
          await guild.setAFKChannel(null, 'Hủy kênh AFK theo lệnh quản trị');
        }

        // Delete the voice channel
        await targetChannel.delete('Xóa kênh AFK theo yêu cầu của Quản trị viên');

        const embed = new EmbedBuilder()
          .setTitle('🗑️ ĐÃ XÓA KÊNH AFK THÀNH CÔNG')
          .setDescription(`Kênh thoại **${channelName}** đã được xóa triệt để khỏi máy chủ và cấu hình AFK của server đã được reset về mặc định.`)
          .setColor(0x00cc88)
          .setFooter({ text: `Thực hiện bởi: ${interaction.user.tag}` })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      } catch (err: any) {
        await interaction.reply({ content: `❌ Lỗi xóa kênh AFK: ${err.message}`, ephemeral: true });
      }
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('kick-afk')
      .setDescription('Ngắt kết nối toàn bộ thành viên đang treo máy trong phòng voice AFK')
      .addChannelOption(opt =>
        opt.setName('channel')
          .setDescription('Kênh voice cần dọn dẹp (để trống nếu muốn quét kênh AFK mặc định)')
          .addChannelTypes(ChannelType.GuildVoice)
          .setRequired(false)
      ),
    async execute(interaction: ChatInputCommandInteraction) {
      if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.MoveMembers) &&
          interaction.user.id !== OWNER_ID) {
        return interaction.reply({ content: '❌ Bạn không có quyền Move Members để dọn phòng AFK.', ephemeral: true });
      }

      const guild = interaction.guild!;
      let voiceChannel = interaction.options.getChannel('channel') as any;

      if (!voiceChannel) {
        voiceChannel = guild.afkChannel || guild.channels.cache.find(
          c => c.type === ChannelType.GuildVoice && c.name.toLowerCase().includes('afk')
        );
      }

      if (!voiceChannel) {
        return interaction.reply({ content: '❌ Không tìm thấy kênh AFK nào.', ephemeral: true });
      }

      const members = voiceChannel.members;
      const count = members.size;
      if (count === 0) {
        return interaction.reply({ content: `📭 Kênh thoại **${voiceChannel.name}** hiện không có ai treo máy.`, ephemeral: true });
      }

      await interaction.deferReply();
      let kicked = 0;
      for (const [, member] of members) {
        try {
          await (member as GuildMember).voice.disconnect('Quản trị viên dọn dẹp phòng AFK');
          kicked++;
        } catch {}
      }

      await interaction.editReply(`🧹 Đã ngắt kết nối thành công **${kicked}/${count}** thành viên đang treo máy trong kênh <#${voiceChannel.id}>.`);
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('taixiu')
      .setDescription('Mini game Tài Xỉu đổ xúc xắc may mắn 🎲 (Tài: 11-17, Xỉu: 4-10)'),
    async execute(interaction: ChatInputCommandInteraction) {
      const embed = new EmbedBuilder()
        .setTitle('🎲 SÒNG BẠC MAY MẮN: TÀI XỈU AEGIS')
        .setDescription(
          `Chào mừng <@${interaction.user.id}> đến với bàn cược Xúc Xắc!\n\n` +
          `• **TÀI (11 - 17 điểm)**: Tổng 3 xúc xắc lớn\n` +
          `• **XỈU (4 - 10 điểm)**: Tổng 3 xúc xắc nhỏ\n` +
          `• **TAM HOA (Bão)**: 3 mặt xúc xắc giống nhau (Nhà cái ăn)\n\n` +
          `👉 Hãy bấm vào nút bên dưới để chọn cửa cược:`
        )
        .setColor(0xf1c40f)
        .setFooter({ text: 'Mini Game AegisCore • Chúc bạn may mắn!' });

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`taixiu_tai_${interaction.user.id}`)
          .setLabel('🎲 CƯỢC TÀI (11 - 17)')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`taixiu_xiu_${interaction.user.id}`)
          .setLabel('🎲 CƯỢC XỈU (4 - 10)')
          .setStyle(ButtonStyle.Danger)
      );

      await interaction.reply({ embeds: [embed], components: [row] });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('rps')
      .setDescription('Mini game Kéo Búa Bao (Rock Paper Scissors) ✊✋✌️'),
    async execute(interaction: ChatInputCommandInteraction) {
      const embed = new EmbedBuilder()
        .setTitle('✊✋✌️ ĐẤU TRƯỜNG KÉO - BÚA - BAO')
        .setDescription(`Người thách đấu: <@${interaction.user.id}>\n\nHãy chọn một trong 3 đòn tấn công bên dưới để đấu với Bot:`)
        .setColor(0x3498db);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`rps_rock_${interaction.user.id}`)
          .setLabel('✊ BÚA')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`rps_paper_${interaction.user.id}`)
          .setLabel('✋ BAO')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`rps_scissors_${interaction.user.id}`)
          .setLabel('✌️ KÉO')
          .setStyle(ButtonStyle.Danger)
      );

      await interaction.reply({ embeds: [embed], components: [row] });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('coinflip')
      .setDescription('Mini game Tung Đồng Xu may mắn 🪙 (Ngửa / Sấp)'),
    async execute(interaction: ChatInputCommandInteraction) {
      const embed = new EmbedBuilder()
        .setTitle('🪙 TUNG ĐỒNG XU MAY RỦI')
        .setDescription(`Người chơi: <@${interaction.user.id}>\n\nĐoán xem đồng xu sẽ rơi vào mặt nào? Bấm nút bên dưới:`)
        .setColor(0xe67e22);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`coin_heads_${interaction.user.id}`)
          .setLabel('🪙 MẶT NGỬA (Heads)')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`coin_tails_${interaction.user.id}`)
          .setLabel('🪙 MẶT SẤP (Tails)')
          .setStyle(ButtonStyle.Secondary)
      );

      await interaction.reply({ embeds: [embed], components: [row] });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('setup-owner-role')
      .setDescription('Bot tạo Role Quyền Riêng Tối Cao (Administrator) và gán cho Chủ Sở Hữu hoặc người khác')
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
      const isOwner = interaction.user.id === OWNER_ID || interaction.user.id === guild.ownerId;

      if (!isOwner) {
        return interaction.reply({
          content: '❌ Lệnh này là đặc quyền tối thượng của Chủ Sở Hữu (Server Owner). Bạn không có thẩm quyền sử dụng.',
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
            reason: `Bot cấp Role Quyền Riêng Tối Cao theo yêu cầu của Owner (${interaction.user.tag})`
          });
        } else {
          await role.edit({
            color: selectedColor,
            hoist: true,
            permissions: [PermissionsBitField.Flags.Administrator]
          });
        }

        // Try pushing the role as high as possible under bot's highest role
        const botHighest = guild.members.me?.roles.highest.position || 1;
        if (botHighest > 1) {
          await role.setPosition(botHighest - 1).catch(() => null);
        }

        // Add the role to target member
        const targetMember = await guild.members.fetch(targetUser.id);
        await targetMember.roles.add(role, 'Gán Role Quyền Riêng Tối Cao');

        const embed = new EmbedBuilder()
          .setTitle('👑 ĐÃ THIẾT LẬP VÀ GÁN ROLE TỐI CAO THÀNH CÔNG!')
          .setDescription(
            `Hệ thống AegisCore đã sử dụng thẩm quyền tối cao để khởi tạo và trao quyền!\n\n` +
            `• **Tên Role:** <@&${role.id}> (\`${role.name}\`)\n` +
            `• **Được gán cho:** <@${targetMember.id}> (\`${targetMember.user.tag}\`)\n` +
            `• **Quyền hạn nạp sẵn:** \`Administrator 100% (Toàn Quyền Toàn Năng)\`\n` +
            `• **Vị trí hiển thị:** Tách riêng biệt ở nhóm trên cùng (Hoisted)\n` +
            `• **Màu sắc:** \`${colorOption.toUpperCase()}\`\n` +
            `• **Cơ chế bảo vệ:** 🛡️ Bất khả xâm phạm (Nếu là Chủ Sở Hữu và bị kẻ khác gỡ, Bot sẽ tự động gán lại ngay lập tức).`
          )
          .setColor(selectedColor)
          .setThumbnail(targetMember.user.displayAvatarURL())
          .setFooter({ text: 'Aegis Security • Supreme Privilege' })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      } catch (err: any) {
        await interaction.editReply(`❌ Lỗi cấp quyền: ${err.message}. Hãy đảm bảo Role của Bot đang ở vị trí cao hơn trong Server Settings!`);
      }
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('role-give')
      .setDescription('Trao vai trò (Role) cho chính bạn hoặc cho người khác')
      .addUserOption(opt =>
        opt.setName('member')
          .setDescription('Thành viên nhận Role')
          .setRequired(true)
      )
      .addRoleOption(opt =>
        opt.setName('role')
          .setDescription('Vai trò cần trao')
          .setRequired(true)
      ),
    async execute(interaction: ChatInputCommandInteraction) {
      const isOwner = interaction.user.id === OWNER_ID || interaction.user.id === interaction.guild!.ownerId;
      const hasPerm = interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageRoles);

      if (!isOwner && !hasPerm) {
        return interaction.reply({ content: '❌ Bạn không có quyền Manage Roles để trao vai trò.', ephemeral: true });
      }

      const targetUser = interaction.options.getUser('member', true);
      const targetRole = interaction.options.getRole('role', true);
      const guild = interaction.guild!;

      try {
        const targetMember = await guild.members.fetch(targetUser.id);
        const botMember = guild.members.me;

        if (botMember && botMember.roles.highest.position <= (targetRole as any).position) {
          return interaction.reply({
            content: `❌ Bot không thể trao vai trò <@&${targetRole.id}> vì vai trò này nằm cao hơn hoặc ngang bằng với vai trò cao nhất của Bot trong Server Settings!`,
            ephemeral: true
          });
        }

        await targetMember.roles.add(targetRole.id, `Cấp bởi ${interaction.user.tag}`);
        await interaction.reply(`✅ Đã trao thành công vai trò <@&${targetRole.id}> cho <@${targetMember.id}>!`);
      } catch (err: any) {
        await interaction.reply({ content: `❌ Lỗi: ${err.message}`, ephemeral: true });
      }
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('role-take')
      .setDescription('Thu hồi vai trò (Role) khỏi thành viên')
      .addUserOption(opt =>
        opt.setName('member')
          .setDescription('Thành viên bị gỡ Role')
          .setRequired(true)
      )
      .addRoleOption(opt =>
        opt.setName('role')
          .setDescription('Vai trò cần thu hồi')
          .setRequired(true)
      ),
    async execute(interaction: ChatInputCommandInteraction) {
      const isOwner = interaction.user.id === OWNER_ID || interaction.user.id === interaction.guild!.ownerId;
      const hasPerm = interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageRoles);

      if (!isOwner && !hasPerm) {
        return interaction.reply({ content: '❌ Bạn không có quyền Manage Roles để gỡ vai trò.', ephemeral: true });
      }

      const targetUser = interaction.options.getUser('member', true);
      const targetRole = interaction.options.getRole('role', true);
      const guild = interaction.guild!;

      try {
        const targetMember = await guild.members.fetch(targetUser.id);
        await targetMember.roles.remove(targetRole.id, `Thu hồi bởi ${interaction.user.tag}`);
        await interaction.reply(`✅ Đã thu hồi thành công vai trò <@&${targetRole.id}> khỏi <@${targetMember.id}>!`);
      } catch (err: any) {
        await interaction.reply({ content: `❌ Lỗi: ${err.message}`, ephemeral: true });
      }
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('blackjack')
      .setDescription('Mini game Xì Dách (Blackjack) 21 điểm với lá bài tương tác nút bấm 🃏'),
    async execute(interaction: ChatInputCommandInteraction) {
      const deck = createDeck();
      const playerHand = [deck.pop()!, deck.pop()!];
      const dealerHand = [deck.pop()!, deck.pop()!];

      const playerScore = calculateHandScore(playerHand);
      const isNaturalBj = playerScore === 21;

      const game: BlackjackGame = {
        userId: interaction.user.id,
        deck,
        playerHand,
        dealerHand,
        state: isNaturalBj ? 'finished' : 'playing'
      };
      blackjackGames.set(interaction.user.id, game);

      const embed = new EmbedBuilder()
        .setTitle('🃏 SÒNG BẠC BLACKJACK / XÌ DÁCH 21 ĐIỂM')
        .setDescription(
          `**Người chơi:** <@${interaction.user.id}>\n\n` +
          `• **Bài của bạn:** ${formatHand(playerHand)} (Điểm: **${playerScore}**)\n` +
          `• **Bài của Nhà Cái (Dealer):** ${formatHand(dealerHand, !isNaturalBj)} (Điểm hiện: **${isNaturalBj ? calculateHandScore(dealerHand) : dealerHand[0].weight}**)\n\n` +
          (isNaturalBj
            ? '🎉 **XÌ DÁCH TỰ NHIÊN (BLACKJACK)! BẠN ĐÃ THẮNG LỚN!**'
            : '👉 Bấm **🃏 Rút Thêm** hoặc **✋ Dằn Bài** để so điểm:')
        )
        .setColor(isNaturalBj ? 0x2ecc71 : 0xf1c40f)
        .setFooter({ text: 'Aegis Casino • Blackjack Room' })
        .setTimestamp();

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`bj_hit_${interaction.user.id}`)
          .setLabel('🃏 Rút Thêm (Hit)')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(isNaturalBj),
        new ButtonBuilder()
          .setCustomId(`bj_stand_${interaction.user.id}`)
          .setLabel('✋ Dằn Bài (Stand)')
          .setStyle(ButtonStyle.Success)
          .setDisabled(isNaturalBj)
      );

      await interaction.reply({ embeds: [embed], components: [row] });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('caro')
      .setDescription('Thách đấu Cờ Caro (Tic-Tac-Toe) 2 người chơi thật sự (Không đấu với Bot)')
      .addUserOption(opt =>
        opt.setName('opponent')
          .setDescription('Chọn đối thủ bạn muốn thách đấu')
          .setRequired(true)
      ),
    async execute(interaction: ChatInputCommandInteraction) {
      const opponent = interaction.options.getUser('opponent', true);

      if (opponent.bot) {
        return interaction.reply({
          content: '❌ Lệnh cờ Caro chỉ dành cho 2 người chơi thật sự tranh tài, không thể thách đấu với Bot!',
          ephemeral: true
        });
      }

      if (opponent.id === interaction.user.id) {
        return interaction.reply({
          content: '❌ Bạn không thể tự thách đấu chính mình! Hãy chọn một người bạn khác trong server.',
          ephemeral: true
        });
      }

      const gameId = `${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const game: CaroGame = {
        gameId,
        guildId: interaction.guildId!,
        playerX: interaction.user.id,
        playerO: opponent.id,
        turn: 'X',
        board: Array(9).fill(null),
        winner: null
      };
      caroGames.set(gameId, game);

      const embed = new EmbedBuilder()
        .setTitle('⚔️ ĐẤU TRƯỜNG CỜ CARO (TIC-TAC-TOE PVP)')
        .setDescription(
          `Trận đấu giữa 2 kỳ thủ:\n` +
          `• ❌ **Người Thách Đấu:** <@${interaction.user.id}>\n` +
          `• ⭕ **Người Nhận Lời:** <@${opponent.id}>\n\n` +
          `👉 **Lượt đi đầu tiên:** <@${interaction.user.id}> (❌)\n` +
          `Hãy bấm vào ô bàn cờ bên dưới để hạ nước cờ!`
        )
        .setColor(0x3498db)
        .setFooter({ text: 'Aegis Arena • Trận đấu 2 người chơi thật' })
        .setTimestamp();

      const rows = buildCaroRows(game);
      await interaction.reply({
        content: `⚔️ <@${opponent.id}> ơi, bạn vừa nhận được lời thách đấu Cờ Caro từ <@${interaction.user.id}>!`,
        embeds: [embed],
        components: rows
      });
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
          `Chào mừng **${interaction.user.username}**! AegisCore là tổ hợp bot Discord cao cấp kết hợp **Lá Chắn An Ninh Tối Cực (Anti-Raid / Anti-Nuke)**, **Hệ Thống Âm Nhạc Lavalink Hi-Fi** và **Đấu Trường Mini Games Tương Tác**.\n\n` +
          `👑 **Chủ sở hữu hệ thống:** <@${OWNER_ID}> (\`ID: ${OWNER_ID}\`)\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
        )
        .addFields(
          {
            name: '🛡️ BẢO MẬT & PHÒNG THỦ AN NINH',
            value:
              '• `/antiraid-status`: Kiểm tra radar bảo vệ real-time\n' +
              '• `/setup-logs`: Tự động tạo kênh riêng tư `#aegis-security-logs`\n' +
              '• `/lockdown [lock: true/false]`: Khóa/Mở chat khẩn cấp\n' +
              '• `/purge [amount]`: Xóa tin nhắn hàng loạt\n' +
              '• ⚡ **Tự Động:** Ban Bot lạ, Ban kẻ nuke kênh/role, Chặn link rác/scam',
            inline: false
          },
          {
            name: '🎵 ÂM NHẠC HI-FI (LAVALINK HI-RES)',
            value:
              '• `/play [query]`: Tìm kiếm & phát nhạc YouTube/SoundCloud/MP3\n' +
              '• `/pause` & `/resume`: Tạm dừng / Tiếp tục bài hát\n' +
              '• `/skip` & `/stop`: Bỏ qua bài / Rời phòng voice\n' +
              '• `/queue`: Xem danh sách bài hát đang chờ\n' +
              '• `/volume [percent]`: Chỉnh âm lượng Lavalink (1 - 150%)',
            inline: false
          },
          {
            name: '👑 QUẢN TRỊ SERVER & ĐẶC QUYỀN OWNER',
            value:
              '• `/setup-owner-role [name] [color] [target]`: Tạo & gán Role Quản Trị Tối Cao cho Chủ hoặc người khác\n' +
              '• `/role-give [member] [role]`: Cấp bất kỳ Role nào cho thành viên\n' +
              '• `/role-take [member] [role]`: Thu hồi Role khỏi thành viên\n' +
              '• `/delete-afk-channel [channel]`: Xóa vĩnh viễn kênh voice AFK\n' +
              '• `/kick-afk [channel]`: Dọn dẹp/Kick người treo máy trong phòng AFK',
            inline: false
          },
          {
            name: '🎮 ĐẤU TRƯỜNG MINI GAMES GIẢI TRÍ',
            value:
              '• `/blackjack`: Sòng bạc Xì Dách 21 điểm tương tác nút bấm 🃏\n' +
              '• `/caro [opponent]`: Thách đấu Cờ Caro 2 người chơi (PVP trực tiếp) ⚔️\n' +
              '• `/taixiu`: Đổ 3 hột xúc xắc Tài Xỉu may mắn 🎲\n' +
              '• `/rps`: Quyết đấu Kéo - Búa - Bao ✊✋✌️\n' +
              '• `/coinflip`: Tung đồng xu may rủi 🪙 (Ngửa/Sấp)',
            inline: false
          }
        )
        .setImage(bannerUrl)
        .setColor(0x5865f2)
        .setFooter({ text: 'AegisCore Suite • Được bảo vệ bởi Chủ Sở Hữu' })
        .setTimestamp();

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel('👑 Profile Chủ Sở Hữu (Discord Link)')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/users/${OWNER_ID}`),
        new ButtonBuilder()
          .setCustomId('btn_view_owner_profile')
          .setLabel('👑 Thẻ Thông Tin Chủ Server')
          .setStyle(ButtonStyle.Primary)
      );

      await interaction.reply({ embeds: [embed], components: [row] });
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

    // Handle Mini Game: Tai Xiu Buttons
    if (interaction.isButton() && interaction.customId.startsWith('taixiu_')) {
      const parts = interaction.customId.split('_');
      const choice = parts[1]; // 'tai' or 'xiu'
      const originalUserId = parts[2];

      if (originalUserId && interaction.user.id !== originalUserId) {
        return interaction.reply({
          content: '❌ Đây là bàn cược của người khác. Hãy gõ lệnh `/taixiu` để tự mở bàn cược cho riêng bạn!',
          ephemeral: true
        });
      }

      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const d3 = Math.floor(Math.random() * 6) + 1;
      const total = d1 + d2 + d3;
      const isStorm = d1 === d2 && d2 === d3;

      let resultText = '';
      let isWin = false;

      if (isStorm) {
        resultText = `🌪️ BÃO TAM HOA (${d1}-${d2}-${d3}) - Nhà cái ăn trọn!`;
        isWin = false;
      } else if (total >= 11) {
        resultText = 'TÀI';
        isWin = choice === 'tai';
      } else {
        resultText = 'XỈU';
        isWin = choice === 'xiu';
      }

      const diceEmojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
      const embed = new EmbedBuilder()
        .setTitle('🎲 KẾT QUẢ ĐỔ XÚC XẮC TÀI XỈU')
        .setDescription(
          `**Người chơi:** <@${interaction.user.id}>\n` +
          `**Cửa đã chọn:** **${choice === 'tai' ? '🟢 TÀI (11-17)' : '🔴 XỈU (4-10)'}**\n\n` +
          `🎲 **Xúc xắc:** \`[ ${diceEmojis[d1 - 1]} ${d1} ]\` + \`[ ${diceEmojis[d2 - 1]} ${d2} ]\` + \`[ ${diceEmojis[d3 - 1]} ${d3} ]\`\n` +
          `📊 **Tổng điểm:** \`${total}\` điểm $\\rightarrow$ **${resultText}**\n\n` +
          `**Kết quả:** ${isWin ? '🎉 **BẠN ĐÃ THẮNG CƯỢC!** Xuất sắc!' : '💀 **BẠN ĐÃ THUA CƯỢC!** Chúc bạn may mắn lần sau!'}`
        )
        .setColor(isWin ? 0x2ecc71 : 0xe74c3c)
        .setTimestamp();

      await interaction.update({ embeds: [embed], components: [] });
      return;
    }

    // Handle Mini Game: Rock Paper Scissors Buttons
    if (interaction.isButton() && interaction.customId.startsWith('rps_')) {
      const parts = interaction.customId.split('_');
      const userChoice = parts[1]; // 'rock', 'paper', 'scissors'
      const originalUserId = parts[2];

      if (originalUserId && interaction.user.id !== originalUserId) {
        return interaction.reply({
          content: '❌ Hãy dùng lệnh `/rps` để mở lượt đấu kéo búa bao của riêng bạn!',
          ephemeral: true
        });
      }

      const choices = ['rock', 'paper', 'scissors'];
      const botChoice = choices[Math.floor(Math.random() * choices.length)];

      const choiceNames: Record<string, string> = {
        rock: '✊ Búa',
        paper: '✋ Bao',
        scissors: '✌️ Kéo'
      };

      let outcome = '';
      let color = 0x3498db;

      if (userChoice === botChoice) {
        outcome = '🤝 **KẾT QUẢ HÒA!** Cả hai đều chọn như nhau.';
        color = 0xf39c12;
      } else if (
        (userChoice === 'rock' && botChoice === 'scissors') ||
        (userChoice === 'paper' && botChoice === 'rock') ||
        (userChoice === 'scissors' && botChoice === 'paper')
      ) {
        outcome = '🏆 **BẠN ĐÃ CHIẾN THẮNG!** Đòn đánh tuyệt vời!';
        color = 0x2ecc71;
      } else {
        outcome = '💀 **BOT ĐÃ THẮNG!** Bạn đã bị hạ gục!';
        color = 0xe74c3c;
      }

      const embed = new EmbedBuilder()
        .setTitle('✊✋✌️ KẾT QUẢ ĐẤU TRƯỜNG KÉO BÚA BAO')
        .setDescription(
          `**Người chơi:** <@${interaction.user.id}>\n\n` +
          `• **Bạn chọn:** ${choiceNames[userChoice]}\n` +
          `• **Bot chọn:** ${choiceNames[botChoice]}\n\n` +
          `${outcome}`
        )
        .setColor(color)
        .setTimestamp();

      await interaction.update({ embeds: [embed], components: [] });
      return;
    }

    // Handle Mini Game: Coinflip Buttons
    if (interaction.isButton() && interaction.customId.startsWith('coin_')) {
      const parts = interaction.customId.split('_');
      const userSide = parts[1]; // 'heads' or 'tails'
      const originalUserId = parts[2];

      if (originalUserId && interaction.user.id !== originalUserId) {
        return interaction.reply({
          content: '❌ Hãy dùng lệnh `/coinflip` để tung đồng xu của riêng bạn!',
          ephemeral: true
        });
      }

      const outcome = Math.random() < 0.5 ? 'heads' : 'tails';
      const isWin = userSide === outcome;

      const embed = new EmbedBuilder()
        .setTitle('🪙 KẾT QUẢ TUNG ĐỒNG XU')
        .setDescription(
          `**Người chơi:** <@${interaction.user.id}>\n` +
          `**Dự đoán của bạn:** ${userSide === 'heads' ? '🪙 Mặt Ngửa (Heads)' : '🪙 Mặt Sấp (Tails)'}\n\n` +
          `🎯 **Đồng xu rơi vào:** **${outcome === 'heads' ? '🪙 MẶT NGỬA (HEADS)' : '🪙 MẶT SẤP (TAILS)'}**\n\n` +
          `**Kết quả:** ${isWin ? '🎉 **BẠN ĐOÁN CHÍNH XÁC!** Thần tài mỉm cười!' : '💔 **BẠN ĐOÁN SAI RỒI!** Chúc may mắn lần sau!'}`
        )
        .setColor(isWin ? 0x2ecc71 : 0xe74c3c)
        .setTimestamp();

      await interaction.update({ embeds: [embed], components: [] });
      return;
    }

    // Handle Owner Profile Modal/Embed Button
    if (interaction.isButton() && interaction.customId === 'btn_view_owner_profile') {
      let ownerUser: any = null;
      try {
        ownerUser = await client.users.fetch(OWNER_ID);
      } catch {}

      const ownerEmbed = new EmbedBuilder()
        .setTitle('👑 HỒ SƠ CHỦ SỞ HỮU TỐI CAO (SYSTEM OWNER)')
        .setDescription(
          `Thông tin chi tiết về Đấng Sáng Lập & Chủ Quản hệ thống AegisCore:\n\n` +
          `• **Tên Discord:** ${ownerUser ? `**${ownerUser.tag}**` : `<@${OWNER_ID}>`}\n` +
          `• **User ID:** \`${OWNER_ID}\`\n` +
          `• **Vị trí quyền lực:** \`Founder & Supreme Overlord\`\n` +
          `• **Quyền hạn Bot:** Miễn trừ 100% mọi cơ chế trừng phạt & Toàn quyền điều phối\n` +
          `• **Trang cá nhân:** [Bấm vào đây để mở Discord Profile](https://discord.com/users/${OWNER_ID})`
        )
        .setColor(0xffd700)
        .setTimestamp();

      if (ownerUser && ownerUser.displayAvatarURL()) {
        ownerEmbed.setThumbnail(ownerUser.displayAvatarURL());
      }

      const ownerRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel('👑 Mở Discord Profile Chủ')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/users/${OWNER_ID}`)
      );

      return interaction.reply({ embeds: [ownerEmbed], components: [ownerRow], ephemeral: true });
    }

    // Handle Blackjack Hit & Stand Buttons
    if (interaction.isButton() && (interaction.customId.startsWith('bj_hit_') || interaction.customId.startsWith('bj_stand_'))) {
      const isHit = interaction.customId.startsWith('bj_hit_');
      const gameUserId = interaction.customId.replace(isHit ? 'bj_hit_' : 'bj_stand_', '');

      if (interaction.user.id !== gameUserId) {
        return interaction.reply({ content: '❌ Đây là ván bài Xì Dách của người khác. Hãy gõ `/blackjack` để chơi ván riêng của bạn!', ephemeral: true });
      }

      const game = blackjackGames.get(gameUserId);
      if (!game || game.state !== 'playing') {
        return interaction.reply({ content: '❌ Ván bài này đã kết thúc. Hãy gõ `/blackjack` để mở ván mới!', ephemeral: true });
      }

      if (isHit) {
        const card = game.deck.pop();
        if (card) game.playerHand.push(card);
        const score = calculateHandScore(game.playerHand);

        if (score > 21) {
          game.state = 'finished';
          const bustEmbed = new EmbedBuilder()
            .setTitle('💀 BẠN ĐÃ BỊ QUẮC (>21 ĐIỂM)! NHÀ CÁI THẮNG!')
            .setDescription(
              `**Người chơi:** <@${gameUserId}>\n\n` +
              `• **Bài của bạn:** ${formatHand(game.playerHand)} (Tổng điểm: **${score}** - Quắc)\n` +
              `• **Bài của Nhà Cái:** ${formatHand(game.dealerHand)} (Điểm: **${calculateHandScore(game.dealerHand)}**)\n\n` +
              `💥 **Kết quả:** Quá 21 điểm! Bạn đã thua ván cược này.`
            )
            .setColor(0xe74c3c)
            .setTimestamp();
          return interaction.update({ embeds: [bustEmbed], components: [] });
        } else if (score === 21) {
          game.state = 'stand';
        } else {
          const continueEmbed = new EmbedBuilder()
            .setTitle('🃏 SÒNG BẠC BLACKJACK / XÌ DÁCH 21 ĐIỂM')
            .setDescription(
              `**Người chơi:** <@${gameUserId}>\n\n` +
              `• **Bài của bạn:** ${formatHand(game.playerHand)} (Điểm: **${score}**)\n` +
              `• **Bài của Nhà Cái (Dealer):** ${formatHand(game.dealerHand, true)} (Điểm hiện: **${game.dealerHand[0].weight}**)\n\n` +
              `👉 Bấm **🃏 Rút Thêm** hoặc **✋ Dằn Bài**:`
            )
            .setColor(0xf1c40f)
            .setTimestamp();
          return interaction.update({ embeds: [continueEmbed] });
        }
      }

      // If stand or reached 21
      game.state = 'finished';
      let dealerScore = calculateHandScore(game.dealerHand);
      while (dealerScore < 17 && game.deck.length > 0) {
        game.dealerHand.push(game.deck.pop()!);
        dealerScore = calculateHandScore(game.dealerHand);
      }

      const finalPlayerScore = calculateHandScore(game.playerHand);
      let winState = '';
      let finalColor = 0x3498db;

      if (dealerScore > 21) {
        winState = '🎉 **NHÀ CÁI ĐÃ BỊ QUẮC (>21)! BẠN ĐÃ THẮNG CUỘC!**';
        finalColor = 0x2ecc71;
      } else if (finalPlayerScore > dealerScore) {
        winState = `🎉 **BẠN ĐÃ CHIẾN THẮNG!** (${finalPlayerScore} điểm > ${dealerScore} điểm của Nhà Cái)`;
        finalColor = 0x2ecc71;
      } else if (finalPlayerScore < dealerScore) {
        winState = `💀 **NHÀ CÁI ĐÃ THẮNG!** (${dealerScore} điểm > ${finalPlayerScore} điểm của bạn)`;
        finalColor = 0xe74c3c;
      } else {
        winState = `🤝 **HÒA TIỀN (PUSH)!** Cả hai bên đều đạt ${finalPlayerScore} điểm.`;
        finalColor = 0xf39c12;
      }

      const finalEmbed = new EmbedBuilder()
        .setTitle('🃏 KẾT QUẢ SO ĐIỂM BLACKJACK / XÌ DÁCH')
        .setDescription(
          `**Người chơi:** <@${gameUserId}>\n\n` +
          `• **Bài của bạn:** ${formatHand(game.playerHand)} (Tổng điểm: **${finalPlayerScore}**)\n` +
          `• **Bài của Nhà Cái:** ${formatHand(game.dealerHand)} (Tổng điểm: **${dealerScore}**)\n\n` +
          `${winState}`
        )
        .setColor(finalColor)
        .setTimestamp();

      return interaction.update({ embeds: [finalEmbed], components: [] });
    }

    // Handle Caro PVP Move Buttons
    if (interaction.isButton() && interaction.customId.startsWith('caro_')) {
      const parts = interaction.customId.split('_');
      const gameId = `${parts[1]}_${parts[2]}`;
      const cellIndex = parseInt(parts[3], 10);

      const game = caroGames.get(gameId);
      if (!game) {
        return interaction.reply({ content: '❌ Ván cờ này không tồn tại hoặc đã hết hạn.', ephemeral: true });
      }

      if (game.winner !== null) {
        return interaction.reply({ content: '❌ Ván cờ này đã kết thúc!', ephemeral: true });
      }

      const currentUserId = game.turn === 'X' ? game.playerX : game.playerO;
      if (interaction.user.id !== currentUserId) {
        if (interaction.user.id !== game.playerX && interaction.user.id !== game.playerO) {
          return interaction.reply({ content: '❌ Bạn là khán giả, không thể can thiệp vào ván cờ này! Hãy gõ `/caro` để tự tạo bàn đấu mới.', ephemeral: true });
        }
        return interaction.reply({ content: `⏳ Chưa tới lượt của bạn! Đang là lượt của <@${currentUserId}> (${game.turn === 'X' ? '❌' : '⭕'}).`, ephemeral: true });
      }

      if (game.board[cellIndex] !== null) {
        return interaction.reply({ content: '❌ Ô này đã có người đánh!', ephemeral: true });
      }

      game.board[cellIndex] = game.turn;

      const winResult = checkCaroWinner(game.board);
      if (winResult) {
        game.winner = winResult;
        let desc = '';
        let color = 0x2ecc71;

        if (winResult === 'tie') {
          desc = `🤝 **TRẬN ĐẤU BẤT PHÂN THẮNG BẠI! HÒA CỜ!**\nCả 2 kỳ thủ <@${game.playerX}> và <@${game.playerO}> đều thủ thế xuất sắc.`;
          color = 0xf39c12;
        } else {
          const winnerId = winResult === 'X' ? game.playerX : game.playerO;
          desc = `🏆 **CHIẾN THẮNG TUYỆT ĐỐI!**\nKỳ thủ <@${winnerId}> (${winResult === 'X' ? '❌' : '⭕'}) đã đả bại đối phương với 3 nước cờ liên tiếp!`;
          color = winResult === 'X' ? 0xe74c3c : 0x3498db;
        }

        const winEmbed = new EmbedBuilder()
          .setTitle('⚔️ KẾT QUẢ ĐẤU TRƯỜNG CỜ CARO (PVP)')
          .setDescription(desc)
          .setColor(color)
          .setTimestamp();

        const finalRows = buildCaroRows(game);
        return interaction.update({ embeds: [winEmbed], components: finalRows });
      }

      game.turn = game.turn === 'X' ? 'O' : 'X';
      const nextUserId = game.turn === 'X' ? game.playerX : game.playerO;

      const nextEmbed = new EmbedBuilder()
        .setTitle('⚔️ ĐẤU TRƯỜNG CỜ CARO (TIC-TAC-TOE PVP)')
        .setDescription(
          `Trận đấu giữa 2 kỳ thủ:\n` +
          `• ❌ **Kỳ thủ X:** <@${game.playerX}>\n` +
          `• ⭕ **Kỳ thủ O:** <@${game.playerO}>\n\n` +
          `👉 **Lượt tiếp theo:** <@${nextUserId}> (${game.turn === 'X' ? '❌' : '⭕'})`
        )
        .setColor(0x3498db)
        .setTimestamp();

      const rows = buildCaroRows(game);
      return interaction.update({ embeds: [nextEmbed], components: rows });
    }
  });

  // Security Log Dispatcher
  async function sendSecurityLog(guild: any, embed: EmbedBuilder) {
    try {
      let logChannel: TextChannel | undefined;
      if (LOG_CHANNEL_ID) {
        logChannel = guild.channels.cache.get(LOG_CHANNEL_ID) as TextChannel;
      }
      if (!logChannel) {
        logChannel = guild.channels.cache.find(
          (c: any) => (c.name.includes('aegis-security') || c.name.includes('security-logs') || c.name.includes('bot-logs')) && c.isTextBased()
        ) as TextChannel;
      }
      if (!logChannel && guild.systemChannel) {
        logChannel = guild.systemChannel as TextChannel;
      }
      if (logChannel) {
        await logChannel.send({ embeds: [embed] }).catch(() => null);
      }
    } catch (e) {
      console.error('[Security Log Error]:', e);
    }
  }

  const INVITE_REGEX = /(discord\.(gg|io|me|li)|discordapp\.com\/invite|discord\.com\/invite)\/[a-zA-Z0-9]+/i;
  const RAID_COMMAND_REGEX = /^[!./+?$#~](nuke|raid|destroy|banall|kickall|spam|crash|deleteall|pruneall|killguild|wizz|fuck)/i;
  const PHISHING_REGEX = /(free-nitro|discord-gift|steamcommunity\.link|discorcl\.gift|steam-gift|dlscord\.com|steamcommuniity|nitro-drop)/i;

  // Ruthless Anti-Raid, Rogue Bot Auto-Ban & Message Cleaner
  client.on(Events.MessageCreate, async (message) => {
    if (!message.guild || message.author.id === client.user?.id) return;
    if (message.author.id === OWNER_ID) return; // Whitelist Owner

    const content = message.content || '';
    const isBot = message.author.bot;
    const now = Date.now();

    // Track message frequency
    const timestamps = userMsgHistory.get(message.author.id) || [];
    const recent = timestamps.filter(t => now - t < 3000);
    recent.push(now);
    userMsgHistory.set(message.author.id, recent);

    const isSpamming = recent.length > 3;
    const isRaidCommand = RAID_COMMAND_REGEX.test(content);
    const isPhishing = PHISHING_REGEX.test(content);
    const isInvite = INVITE_REGEX.test(content);
    const isMassMention = message.mentions.users.size > 3 || message.mentions.roles.size > 2 ||
      (content.includes('@everyone') && !message.member?.permissions.has(PermissionsBitField.Flags.MentionEveryone));

    // Case 1: ROGUE EXTERNAL BOT ATTACK (Auto-Ban Rogue Bot Immediately!)
    if (isBot) {
      if (isSpamming || isRaidCommand || isPhishing || isInvite || isMassMention) {
        await message.delete().catch(() => null);

        // BAN THE ROGUE BOT
        await message.guild.members.ban(message.author.id, {
          reason: `[Aegis Anti-Raid] Tiêu diệt Bot bên ngoài phá hoại / Spam raid: ${content.slice(0, 50)}`
        }).catch((err) => {
          console.error(`[Ban Bot Error]:`, err.message);
        });

        const alertEmbed = new EmbedBuilder()
          .setTitle('🚨 [AEGIS SECURITY] ĐÃ TIÊU DIỆT & BAN THẲNG TAY BOT PHÁ HOẠI!')
          .setDescription(`Hệ thống Aegis Shield đã phát hiện và thi hành lệnh BAN ngay lập tức đối với bot lạ cố tình spam/phá hoại.`)
          .addFields(
            { name: '🤖 Bot bị tiêu diệt', value: `<@${message.author.id}> (\`${message.author.tag}\`)`, inline: true },
            { name: '🆔 Bot ID', value: `\`${message.author.id}\``, inline: true },
            { name: '⚠️ Hành vi', value: isRaidCommand ? 'Gọi lệnh Raid' : isPhishing ? 'Gửi link lừa đảo' : isInvite ? 'Gửi link mời Discord' : 'Spam tin nhắn hàng loạt', inline: false },
            { name: '🔨 Biện pháp thi hành', value: '**BAN VĨNH VIỄN KHỎI SERVER (Cấm tái xuất hiện)**', inline: false }
          )
          .setColor(0xff0044)
          .setTimestamp();

        await message.channel.send({ embeds: [alertEmbed] }).catch(() => null);
        await sendSecurityLog(message.guild, alertEmbed);
        return;
      }
    }

    // Case 2: HUMAN USER TRIGGERING RAID COMMANDS OR MALICIOUS ACTIONS
    if (!isBot) {
      // 2A: User calling a Raid/Nuke command (e.g. !nuke, !raid, .destroy, !banall)
      if (isRaidCommand) {
        await message.delete().catch(() => null);

        // Ban the raid instigator immediately!
        await message.guild.members.ban(message.author.id, {
          reason: `[Aegis Anti-Raid] Kẻ chủ mưu gọi lệnh phá hoại server: ${content.slice(0, 60)}`
        }).catch(() => null);

        const alertEmbed = new EmbedBuilder()
          .setTitle('🚨 [AEGIS SECURITY] ĐÃ BAN THẲNG TAY KẺ GỌI LỆNH RAID!')
          .setDescription(`Phát hiện đối tượng cố tình tương tác / gọi lệnh phá hoại server. Hệ thống đã thi hành lệnh BAN ngay lập tức!`)
          .addFields(
            { name: '👤 Kẻ vi phạm', value: `<@${message.author.id}> (\`${message.author.tag}\`)`, inline: true },
            { name: '🛑 Lệnh đã gõ', value: `\`${content.slice(0, 100)}\``, inline: true },
            { name: '🔨 Biện pháp xử lý', value: '**ĐÃ BỊ BAN THẲNG TAY KHỎI SERVER**', inline: false }
          )
          .setColor(0xff0044)
          .setTimestamp();

        await message.channel.send({ embeds: [alertEmbed] }).catch(() => null);
        await sendSecurityLog(message.guild, alertEmbed);
        return;
      }

      // 2B: User sending Phishing links or unauthorized Discord Invites
      if (isPhishing || isInvite) {
        await message.delete().catch(() => null);

        if (isPhishing) {
          // Phishing link: Ban immediately!
          await message.guild.members.ban(message.author.id, {
            reason: '[Aegis Anti-Phishing] Phát tán link lừa đảo / Nitro giả mạo'
          }).catch(() => null);

          const alertEmbed = new EmbedBuilder()
            .setTitle('🚨 [AEGIS SECURITY] ĐÃ BAN KẺ PHÁT TÁN LINK LỪA ĐẢO!')
            .setDescription(`Người dùng <@${message.author.id}> đã phát tán liên kết lừa đảo/scam độc hại và bị BAN vĩnh viễn.`)
            .setColor(0xff0044)
            .setTimestamp();

          await message.channel.send({ embeds: [alertEmbed] }).catch(() => null);
          await sendSecurityLog(message.guild, alertEmbed);
        } else {
          // Invite link: Timeout 1 hour + Warning
          if (message.member) {
            await message.member.timeout(60 * 60 * 1000, '[Aegis Anti-Invite] Quảng cáo server trái phép').catch(() => null);
          }
          await message.channel.send(`⚠️ <@${message.author.id}> **CẢNH BÁO:** Tin nhắn quảng cáo link server của bạn đã bị tiêu hủy và bạn bị cấm chat 1 giờ!`).catch(() => null);
        }
        return;
      }

      // 2C: User spamming messages or mass mentions (> 3 messages / 3s)
      if (isSpamming || isMassMention) {
        await message.delete().catch(() => null);
        if (message.member) {
          await message.member.timeout(15 * 60 * 1000, '[Aegis Anti-Spam] Spam flood / Mass mention').catch(() => null);
        }
        await message.channel.send(`⚠️ <@${message.author.id}> **CẢNH BÁO AN NINH:** Bạn bị cấm chat 15 phút do hành vi spam tin nhắn / tag vô tội vạ.`).catch(() => null);
        return;
      }
    }
  });

  // Anti-Bot Protection: Auto-ban rogue bots added by non-owners
  client.on(Events.GuildMemberAdd, async (member) => {
    if (!member.user.bot) return;

    try {
      const auditLogs = await member.guild.fetchAuditLogs({
        type: AuditLogEvent.BotAdd,
        limit: 1
      }).catch(() => null);

      const entry = auditLogs?.entries.first();
      const inviter = entry?.executor;

      // If invited by someone who is NOT the Owner and NOT the Bot itself
      if (inviter && inviter.id !== OWNER_ID && inviter.id !== client.user?.id) {
        // BAN THE UNAPPROVED BOT IMMEDIATELY
        await member.ban({
          reason: `[Aegis Anti-Bot] Bot lạ được mời trái phép bởi kẻ không có thẩm quyền (${inviter.tag})`
        }).catch(() => null);

        // TIMEOUT OR BAN THE PERSON WHO INVITED THE BOT
        const inviterMember = await member.guild.members.fetch(inviter.id).catch(() => null);
        if (inviterMember) {
          await inviterMember.timeout(24 * 60 * 60 * 1000, '[Aegis Anti-Raid] Tự ý thêm Bot lạ vào server khi chưa được phép').catch(() => null);
        }

        const alertEmbed = new EmbedBuilder()
          .setTitle('🚨 [AEGIS ANTI-BOT] PHÁT HIỆN BOT LẠ ĐƯỢC MỜI VÀO SERVER TRÁI PHÉP!')
          .setDescription(`Hệ thống đã tự động kích hoạt chế độ phòng thủ: **BAN Bot lạ ngay tại cửa** và **cách ly kẻ mời bot**!`)
          .addFields(
            { name: '🤖 Bot bị BAN', value: `${member.user.tag} (\`${member.user.id}\`)`, inline: true },
            { name: '👤 Kẻ mời bot', value: `<@${inviter.id}> (\`${inviter.tag}\`)`, inline: true },
            { name: '🛡️ Trạng thái', value: 'Đã trục xuất Bot & Tước quyền kẻ mời bot', inline: false }
          )
          .setColor(0xff0044)
          .setTimestamp();

        await sendSecurityLog(member.guild, alertEmbed);
      }
    } catch (err: any) {
      console.error('[Anti-Bot Error]:', err?.message || err);
    }
  });

  // Anti-Nuke: Ban nuker & Auto-restore when a channel is deleted
  client.on(Events.ChannelDelete, async (channel) => {
    if (!('guild' in channel) || !channel.guild) return;
    const guild = channel.guild;

    try {
      const auditLogs = await guild.fetchAuditLogs({
        type: AuditLogEvent.ChannelDelete,
        limit: 1
      }).catch(() => null);

      const entry = auditLogs?.entries.first();
      const nuker = entry?.executor;

      if (nuker && nuker.id !== OWNER_ID && nuker.id !== client.user?.id) {
        // BAN NUKER IMMEDIATELY
        await guild.members.ban(nuker.id, {
          reason: `[Aegis Anti-Nuke] Cố tình xóa kênh: ${(channel as any).name}`
        }).catch(() => null);

        // AUTO RESTORE DELETED CHANNEL
        const restored = await guild.channels.create({
          name: (channel as any).name,
          type: (channel as any).type,
          parent: (channel as any).parentId,
          reason: '[Aegis Auto-Restore] Tự động khôi phục kênh bị nuker xóa'
        }).catch(() => null);

        const alertEmbed = new EmbedBuilder()
          .setTitle('🚨 [AEGIS ANTI-NUKE] ĐÃ BAN KẺ XÓA KÊNH & TỰ ĐỘNG KHÔI PHỤC!')
          .setDescription(`Phát hiện hành vi phá hoại xóa kênh server. AegisCore đã tiêu diệt thủ phạm và tái tạo lại kênh ngay lập tức!`)
          .addFields(
            { name: '👤 Nuker bị BAN', value: `<@${nuker.id}> (\`${nuker.tag}\`)`, inline: true },
            { name: '📁 Kênh bị xóa', value: `\`${(channel as any).name}\``, inline: true },
            { name: '✅ Khôi phục', value: restored ? `<#${restored.id}>` : 'Đã khôi phục', inline: true }
          )
          .setColor(0xff0044)
          .setTimestamp();

        await sendSecurityLog(guild, alertEmbed);
      }
    } catch (err: any) {
      console.error('[Anti-Nuke Error]:', err?.message || err);
    }
  });

  // Anti-Nuke: Ban nuker when a role is deleted
  client.on(Events.GuildRoleDelete, async (role) => {
    const guild = role.guild;
    try {
      const auditLogs = await guild.fetchAuditLogs({
        type: AuditLogEvent.RoleDelete,
        limit: 1
      }).catch(() => null);

      const entry = auditLogs?.entries.first();
      const nuker = entry?.executor;

      if (nuker && nuker.id !== OWNER_ID && nuker.id !== client.user?.id) {
        await guild.members.ban(nuker.id, {
          reason: `[Aegis Anti-Nuke] Cố tình xóa vai trò (Role): ${role.name}`
        }).catch(() => null);

        await guild.roles.create({
          name: role.name,
          color: role.color,
          reason: '[Aegis Auto-Restore] Khôi phục Role bị nuker xóa'
        }).catch(() => null);

        const alertEmbed = new EmbedBuilder()
          .setTitle('🚨 [AEGIS ANTI-NUKE] ĐÃ BAN KẺ XÓA ROLE!')
          .setDescription(`Phát hiện hành vi xóa Role server. AegisCore đã BAN thủ phạm <@${nuker.id}> và tái tạo lại Role \`${role.name}\`!`)
          .setColor(0xff0044)
          .setTimestamp();

        await sendSecurityLog(guild, alertEmbed);
      }
    } catch (err: any) {
      console.error('[Anti-RoleDelete Error]:', err?.message || err);
    }
  });

  // Supreme Owner Role Protection: Auto-restore role if removed
  client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
    const isOwner = newMember.id === OWNER_ID || newMember.id === newMember.guild.ownerId;
    if (!isOwner) return;

    // Check if the owner lost a sovereign role
    const lostRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));
    const sovereignRoleLost = lostRoles.find(r => r.name.includes('SOVEREIGN OWNER') || r.name.includes('CHỦ SỞ HỮU'));

    if (sovereignRoleLost) {
      console.warn(`[Owner Shield] Phát hiện Role ${sovereignRoleLost.name} bị gỡ khỏi Owner! Đang tự động gán lại...`);
      await newMember.roles.add(sovereignRoleLost, 'Tự động khôi phục Role Tối Cao cho Owner (Owner Shield)').catch(() => null);

      const alertEmbed = new EmbedBuilder()
        .setTitle('🛡️ [OWNER SHIELD] ĐÃ TỰ ĐỘNG KHÔI PHỤC ROLE CHO CHỦ SỞ HỮU!')
        .setDescription(`Phát hiện vai trò tối cao **${sovereignRoleLost.name}** bị tháo gỡ khỏi Chủ Sở Hữu <@${newMember.id}>. Bot đã tự động gán lại ngay lập tức!`)
        .setColor(0xffd700)
        .setTimestamp();

      await sendSecurityLog(newMember.guild, alertEmbed);
    }
  });

  try {
    console.log('[AegisCore] Đang đăng nhập Discord với Token...');
    await client.login(token);
  } catch (err: any) {
    console.error('[AegisCore] Đăng nhập Discord thất bại:', err.message);
    console.error('👉 Kiểm tra lại DISCORD_TOKEN trên Render xem đã đúng chưa!');
  }
}
