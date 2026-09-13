import type { Message } from 'discord.js';
import { logModerationAction } from '../services/moderationLog.js';
import type { ActionKey } from '../types/moderation.js';
import { banMemberSafe, deleteMessageSafe, kickMemberSafe, timeoutMemberSafe } from './actions.js';
import { automodConfig } from './config.js';
import { isExemptMember } from './exempt.js';
import { pushAndGetMessageHistory } from './state.js';
import {
  calcCapsRatio,
  containsScamPattern,
  countEmojis,
  countUrls,
  extractDomains,
  extractInviteCodes,
  findBlockedAttachment,
  isZalgo,
  matchesBannedRegex,
  matchesBannedWord,
  matchesBlockedDomain,
} from './textDetection.js';

interface ReportAndActParams {
  message: Message;
  action: ActionKey;
  reason: string;
  timeoutMs?: number;
  kick?: boolean;
  ban?: boolean;
  extra?: Record<string, string>;
}

async function reportAndAct(params: ReportAndActParams): Promise<void> {
  const { message, action, reason, timeoutMs, kick, ban, extra } = params;
  const member = message.member;

  if (!automodConfig.logOnly) {
    await deleteMessageSafe(message);
    if (member) {
      if (ban) await banMemberSafe(member, reason);
      else if (kick) await kickMemberSafe(member, reason);
      else if (timeoutMs) await timeoutMemberSafe(member, timeoutMs, reason);
    }
  }

  await logModerationAction({
    guild: message.guild!,
    action,
    moderator: message.client.user!,
    target: message.author,
    reason,
    extra: {
      チャンネル: `${message.channel}`,
      内容: message.content.length > 0 ? message.content.slice(0, 200) : '(テキストなし)',
      ...(automodConfig.logOnly ? { モード: 'ログのみ(自動対応は無効)' } : {}),
      ...extra,
    },
  });
}

export async function runMessageAutomod(message: Message): Promise<void> {
  if (!automodConfig.enabled) return;
  if (message.author.bot || message.webhookId || !message.guild || !message.member) return;
  if (isExemptMember(message.member)) return;
  if (automodConfig.exemptChannelIds.includes(message.channelId)) return;

  const content = message.content ?? '';
  const now = message.createdTimestamp;

  const history = pushAndGetMessageHistory(message.author.id, {
    content,
    timestamp: now,
    channelId: message.channelId,
    hasAttachment: message.attachments.size > 0,
  });

  // 1. 重複メッセージ連投
  if (content.length > 0) {
    const duplicateCount = history.filter(
      (m) => now - m.timestamp <= automodConfig.duplicate.windowMs && m.content === content,
    ).length;
    if (duplicateCount >= automodConfig.duplicate.limit) {
      await reportAndAct({
        message,
        action: 'AUTO_DUPLICATE_SPAM',
        reason: `同一内容のメッセージを${automodConfig.duplicate.windowMs / 1000}秒以内に${duplicateCount}回投稿しました`,
        timeoutMs: 10 * 60 * 1000,
      });
      return;
    }
  }

  // 2. 複数チャンネルへの同一内容投稿(クロスポスト)
  if (content.length > 0) {
    const crosspostChannels = new Set(
      history
        .filter((m) => now - m.timestamp <= automodConfig.crosspost.windowMs && m.content === content)
        .map((m) => m.channelId),
    );
    if (crosspostChannels.size >= automodConfig.crosspost.channelLimit) {
      await reportAndAct({
        message,
        action: 'AUTO_CROSSPOST_SPAM',
        reason: `同一内容のメッセージを${crosspostChannels.size}個のチャンネルに投稿しました`,
        timeoutMs: 15 * 60 * 1000,
      });
      return;
    }
  }

  // 3. メッセージフラッド(内容を問わない連投)
  const floodCount = history.filter((m) => now - m.timestamp <= automodConfig.flood.windowMs).length;
  if (floodCount >= automodConfig.flood.limit) {
    await reportAndAct({
      message,
      action: 'AUTO_MESSAGE_FLOOD',
      reason: `${automodConfig.flood.windowMs / 1000}秒以内に${floodCount}件のメッセージを送信しました`,
      timeoutMs: 10 * 60 * 1000,
    });
    return;
  }

  // 4. 添付ファイルフラッド
  const attachmentCount = history.filter(
    (m) => now - m.timestamp <= automodConfig.attachment.windowMs && m.hasAttachment,
  ).length;
  if (attachmentCount >= automodConfig.attachment.limit) {
    await reportAndAct({
      message,
      action: 'AUTO_ATTACHMENT_FLOOD',
      reason: `${automodConfig.attachment.windowMs / 1000}秒以内に${attachmentCount}件の添付ファイルを送信しました`,
      timeoutMs: 10 * 60 * 1000,
    });
    return;
  }

  // 5. 危険な添付ファイル拡張子(実行ファイル等)
  if (message.attachments.size > 0 && automodConfig.blockedAttachmentExtensions.length > 0) {
    const blockedFile = findBlockedAttachment(
      [...message.attachments.values()].map((a) => a.name),
      automodConfig.blockedAttachmentExtensions,
    );
    if (blockedFile) {
      await reportAndAct({
        message,
        action: 'AUTO_BLOCKED_ATTACHMENT',
        reason: `禁止されている拡張子の添付ファイルを検知しました (${blockedFile})`,
      });
      return;
    }
  }

  // 6. 最大メッセージ文字数(長文による荒らし・掲示板汚染対策)
  if (automodConfig.maxMessageLength > 0 && content.length > automodConfig.maxMessageLength) {
    await reportAndAct({
      message,
      action: 'AUTO_MESSAGE_TOO_LONG',
      reason: `メッセージの文字数(${content.length}文字)が上限(${automodConfig.maxMessageLength}文字)を超えました`,
    });
    return;
  }

  // 7. メンションスパム
  const mentionCount = message.mentions.users.size + message.mentions.roles.size;
  if (mentionCount >= automodConfig.mention.limit) {
    await reportAndAct({
      message,
      action: 'AUTO_MASS_MENTION',
      reason: `1件のメッセージに${mentionCount}件のメンションが含まれていました`,
      timeoutMs: 15 * 60 * 1000,
      extra: { メンション数: `${mentionCount}` },
    });
    return;
  }

  // 8. URL大量投稿(広告/フィッシングURLの連投対策。招待リンク以外の一般URLも対象)
  const urlCount = countUrls(content);
  if (urlCount >= automodConfig.url.limit) {
    await reportAndAct({
      message,
      action: 'AUTO_URL_SPAM',
      reason: `1件のメッセージに${urlCount}件のURLが含まれていました`,
      timeoutMs: 10 * 60 * 1000,
    });
    return;
  }

  // 9. 名指しで禁止したドメイン(詐欺サイト・違法賭博等をピンポイントで遮断)
  if (automodConfig.blockedDomains.length > 0) {
    const domains = extractDomains(content);
    const blockedDomain = matchesBlockedDomain(domains, automodConfig.blockedDomains);
    if (blockedDomain) {
      await reportAndAct({
        message,
        action: 'AUTO_BLOCKED_DOMAIN',
        reason: `禁止ドメインへのリンクを検知しました (${blockedDomain})`,
        timeoutMs: 10 * 60 * 1000,
      });
      return;
    }
  }

  // 10. 詐欺・フィッシングの疑いがあるリンク/文言(最優先で重度対応)
  if (automodConfig.scamLink.block && containsScamPattern(content, automodConfig.scamLink.extraKeywords)) {
    await reportAndAct({
      message,
      action: 'AUTO_SCAM_LINK',
      reason: '詐欺・フィッシングの疑いがあるリンクまたは文言を検知しました',
      ban: true,
    });
    return;
  }

  // 11. 無許可のDiscord招待リンク
  if (automodConfig.invite.block) {
    const codes = extractInviteCodes(content);
    const disallowed = codes.filter((code) => !automodConfig.invite.allowlist.includes(code));
    if (disallowed.length > 0) {
      await reportAndAct({
        message,
        action: 'AUTO_INVITE_LINK',
        reason: `無許可のDiscord招待リンクを投稿しました (${disallowed.join(', ')})`,
        timeoutMs: 10 * 60 * 1000,
      });
      return;
    }
  }

  // 12. 重大NGワード(悪質な差別語・脅迫など、人的対応が必要なもの)
  const severeWord = matchesBannedWord(content, automodConfig.severeBannedWords, automodConfig.normalizeBannedWordMatching);
  if (severeWord) {
    await reportAndAct({
      message,
      action: 'AUTO_BANNED_WORD_SEVERE',
      reason: '重大NGワードを検知しました',
      kick: true,
    });
    return;
  }

  // 13. 通常のNGワード・正規表現
  const bannedWord = matchesBannedWord(content, automodConfig.bannedWords, automodConfig.normalizeBannedWordMatching);
  const regexHit = matchesBannedRegex(content, automodConfig.bannedWordsRegex);
  if (bannedWord || regexHit) {
    await reportAndAct({
      message,
      action: 'AUTO_BANNED_WORD',
      reason: 'NGワードを検知しました',
    });
    return;
  }

  // 14. 大文字乱用(いわゆる叫び)
  if (content.length >= automodConfig.caps.minLength && calcCapsRatio(content) >= automodConfig.caps.ratio) {
    await reportAndAct({
      message,
      action: 'AUTO_CAPS_SPAM',
      reason: '大文字の乱用を検知しました',
    });
    return;
  }

  // 15. 絵文字乱用
  if (countEmojis(content) >= automodConfig.emoji.limit) {
    await reportAndAct({
      message,
      action: 'AUTO_EMOJI_SPAM',
      reason: '絵文字の乱用を検知しました',
    });
    return;
  }

  // 16. Zalgo(装飾)テキスト
  if (automodConfig.zalgo.enabled && isZalgo(content, automodConfig.zalgo.maxMarksPerChar)) {
    await reportAndAct({
      message,
      action: 'AUTO_ZALGO_TEXT',
      reason: '装飾(Zalgo)テキストを検知しました',
    });
    return;
  }
}
