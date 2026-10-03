import { SpamAnalysisResult, AntiSpamSettings } from '../types';

/**
 * Calculates Levenshtein Distance between two strings to measure text similarity
 */
export function calculateSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  if (!a.length || !b.length) return 0.0;

  const matrix: number[][] = [];
  const aLen = a.length;
  const bLen = b.length;

  for (let i = 0; i <= bLen; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= aLen; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= bLen; i++) {
    for (let j = 1; j <= aLen; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  const distance = matrix[bLen][aLen];
  const maxLen = Math.max(aLen, bLen);
  return 1.0 - distance / maxLen;
}

/**
 * Calculates Shannon entropy of a message to detect gibberish or repeated keys
 */
export function calculateEntropy(str: string): number {
  if (!str.length) return 0;
  const frequencies: Record<string, number> = {};
  for (const char of str) {
    frequencies[char] = (frequencies[char] || 0) + 1;
  }
  let entropy = 0;
  const len = str.length;
  for (const char in frequencies) {
    const p = frequencies[char] / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

export interface UserMessageHistory {
  content: string;
  timestamp: number;
}

/**
 * Core smart anti-spam analyzer that separates fast human typing from raid/bot spam
 */
export function analyzeMessage(
  currentContent: string,
  history: UserMessageHistory[],
  settings: AntiSpamSettings
): SpamAnalysisResult {
  const now = Date.now();
  const trimmed = currentContent.trim();
  const lower = trimmed.toLowerCase();

  // 1. Check for Discord invite links
  const discordInviteRegex = /(?:https?:\/\/)?(?:www\.)?(?:discord\.(?:gg|io|me|li)|discord(?:app)?\.com\/invite)\/([a-zA-Z0-9-]{2,32})/i;
  const hasInviteLink = discordInviteRegex.test(trimmed);

  // 2. Check for phishing / malicious shorteners
  const phishingRegex = /(?:steamcommunit[yu]\.com|discord-nitro|dlscord\.com|free-nitro|airdrop)/i;
  const hasPhishingUrl = phishingRegex.test(trimmed);

  // 3. Mentions count
  const mentionMatches = trimmed.match(/<@!?(\d+)>|<@&(\d+)>|@everyone|@here/g);
  const mentionCount = mentionMatches ? mentionMatches.length : 0;

  // 4. Calculate timing and burst rate
  const recentMessages = history.filter((m) => now - m.timestamp <= settings.intervalMs);
  const totalInWindow = recentMessages.length + 1;

  let lastIntervalMs = 999999;
  if (history.length > 0) {
    lastIntervalMs = now - history[history.length - 1].timestamp;
  }

  // 5. Similarity checks against recent messages
  let maxSimilarity = 0;
  for (const past of recentMessages) {
    const sim = calculateSimilarity(lower, past.content.trim().toLowerCase());
    if (sim > maxSimilarity) {
      maxSimilarity = sim;
    }
  }

  // 6. Character entropy & repetition (e.g. "asdasdasd", "aaaaaaa")
  const entropy = calculateEntropy(trimmed);
  const hasRepeatedCharSpam = /(.)\1{7,}/.test(trimmed);

  // 7. Estimate Human Typing Speed (WPM)
  // Average word length ~ 5 characters.
  const estimatedWords = Math.max(1, trimmed.length / 5);
  const secondsSinceLast = Math.max(0.2, lastIntervalMs / 1000);
  const typingSpeedWpm = Math.round((estimatedWords / secondsSinceLast) * 60);

  // Differentiate Fast Typing vs Bot Raid
  let isSpam = false;
  let isRaidBurst = false;
  let isFastHumanTyping = false;
  let reason = 'Tin nhắn hợp lệ';
  let recommendedAction = 'Bỏ qua (Tin nhắn an toàn)';

  // Case A: Phishing or unauthorized invite flood
  if (hasPhishingUrl && settings.blockPhishingLinks) {
    isSpam = true;
    isRaidBurst = true;
    reason = 'Phát hiện liên kết lừa đảo / Phishing Nitro độc hại';
    recommendedAction = 'Xóa tin nhắn + Cấm (Ban) người dùng';
  } else if (hasInviteLink && settings.blockDiscordInvites) {
    isSpam = true;
    reason = 'Phát hiện liên kết mời tham gia Discord (Invite link)';
    recommendedAction = 'Xóa tin nhắn + Cảnh cáo';
  } else if (mentionCount >= settings.maxMentionsPerMessage) {
    isSpam = true;
    isRaidBurst = true;
    reason = `Spam Mention: Gắn thẻ quá nhiều người (${mentionCount} mentions)`;
    recommendedAction = 'Xóa tin nhắn + Timeout 15 phút';
  } else if (hasRepeatedCharSpam) {
    isSpam = true;
    reason = 'Spam ký tự lặp vô nghĩa kéo dài (Character flood)';
    recommendedAction = 'Xóa tin nhắn';
  } else if (totalInWindow >= settings.maxMessagesInInterval) {
    // We have a burst of messages in the interval
    if (maxSimilarity * 100 >= settings.similarityThresholdPercent) {
      // Identical or copy-paste repeated content
      isSpam = true;
      if (lastIntervalMs < 300) {
        isRaidBurst = true;
        reason = `Bot Raid / Macro: Spam lặp nội dung cực nhanh (${lastIntervalMs}ms, giống ${(maxSimilarity * 100).toFixed(0)}%)`;
        recommendedAction = 'Xóa toàn bộ tin nhắn + Timeout 1 giờ';
      } else {
        reason = `Spam tin nhắn trùng lặp nhiều lần (Độ trùng ${(maxSimilarity * 100).toFixed(0)}%)`;
        recommendedAction = 'Xóa tin nhắn + Nhắc nhở hạn chế gửi lại';
      }
    } else {
      // Different contents in rapid succession
      if (lastIntervalMs >= settings.fastTypingGraceMs && entropy > 2.5 && typingSpeedWpm < 180) {
        // High entropy, distinct words, human delay
        isFastHumanTyping = true;
        reason = `Người dùng gõ phím nhanh tự nhiên (~${typingSpeedWpm} WPM, nội dung biến đổi bình thường)`;
        recommendedAction = 'Cho phép gửi (Không phạt, không mute nhầm)';
      } else if (lastIntervalMs < 180) {
        // Macro or script sending distinct messages impossibly fast
        isSpam = true;
        isRaidBurst = true;
        reason = `Tốc độ gửi phi nhân tính (${lastIntervalMs}ms giữa các tin nhắn - Macro / Script flood)`;
        recommendedAction = 'Kích hoạt Slowmode cá nhân + Timeout 10 phút';
      } else {
        isSpam = true;
        reason = `Gửi quá nhiều tin nhắn liên tiếp trong ${settings.intervalMs / 1000}s`;
        recommendedAction = 'Cảnh cáo tốc độ nhắn + Slowmode';
      }
    }
  } else if (lastIntervalMs < settings.fastTypingGraceMs && trimmed.length > 50) {
    // 50+ chars in under grace period implies copy-pasting
    if (maxSimilarity > 0.8) {
      isSpam = true;
      reason = 'Dán nội dung dài lặp lại tức thì (Copy-paste spam)';
      recommendedAction = 'Xóa tin nhắn';
    } else {
      isFastHumanTyping = true;
      reason = 'Dán đoạn văn bản hợp lệ hoặc gõ nhanh';
      recommendedAction = 'Cho phép';
    }
  } else {
    // Normal message
    if (typingSpeedWpm > 90) {
      isFastHumanTyping = true;
      reason = `Gõ phím tốc độ cao (~${typingSpeedWpm} WPM) - Nội dung giao tiếp tự nhiên`;
      recommendedAction = 'Hợp lệ';
    }
  }

  // Duplicate word ratio
  const words = trimmed.split(/\s+/).filter(Boolean);
  const uniqueWords = new Set(words);
  const duplicateWordRatio = words.length > 0 ? 1 - uniqueWords.size / words.length : 0;

  return {
    isSpam,
    isRaidBurst,
    isFastHumanTyping,
    similarityScore: Math.round(maxSimilarity * 100),
    typingSpeedWpm,
    mentionCount,
    hasInviteLink,
    hasPhishingUrl,
    reason,
    recommendedAction,
    metrics: {
      burstRateMs: lastIntervalMs === 999999 ? 0 : lastIntervalMs,
      charEntropy: Number(entropy.toFixed(2)),
      duplicateWordRatio: Number(duplicateWordRatio.toFixed(2)),
    },
  };
}
