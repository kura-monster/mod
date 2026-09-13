import { optional, optionalBool, optionalFloat, optionalInt, optionalList } from '../config.js';

export const automodConfig = {
  enabled: optionalBool('AUTOMOD_ENABLED', true),
  // trueにすると削除やタイムアウト等の自動対応をせず、ログ送信のみ行う(お試しモード)
  logOnly: optionalBool('AUTOMOD_LOG_ONLY', false),
  // このロールを持つメンバーは自動検知の対象外(ManageGuild権限保持者は常に対象外)
  exemptRoleIds: optionalList('AUTOMOD_EXEMPT_ROLE_IDS'),

  duplicate: {
    limit: optionalInt('AUTOMOD_DUPLICATE_LIMIT', 3),
    windowMs: optionalInt('AUTOMOD_DUPLICATE_WINDOW_MS', 10_000),
  },
  flood: {
    limit: optionalInt('AUTOMOD_FLOOD_LIMIT', 6),
    windowMs: optionalInt('AUTOMOD_FLOOD_WINDOW_MS', 5_000),
  },
  mention: {
    limit: optionalInt('AUTOMOD_MENTION_LIMIT', 5),
  },
  emoji: {
    limit: optionalInt('AUTOMOD_EMOJI_LIMIT', 10),
  },
  caps: {
    minLength: optionalInt('AUTOMOD_CAPS_MIN_LENGTH', 10),
    ratio: optionalFloat('AUTOMOD_CAPS_RATIO', 0.7),
  },
  zalgo: {
    enabled: optionalBool('AUTOMOD_BLOCK_ZALGO', true),
    maxMarksPerChar: optionalFloat('AUTOMOD_ZALGO_MAX_MARKS_PER_CHAR', 2),
  },
  attachment: {
    limit: optionalInt('AUTOMOD_ATTACHMENT_LIMIT', 4),
    windowMs: optionalInt('AUTOMOD_ATTACHMENT_WINDOW_MS', 10_000),
  },
  crosspost: {
    channelLimit: optionalInt('AUTOMOD_CROSSPOST_CHANNEL_LIMIT', 3),
    windowMs: optionalInt('AUTOMOD_CROSSPOST_WINDOW_MS', 15_000),
  },
  invite: {
    block: optionalBool('AUTOMOD_BLOCK_INVITE_LINKS', true),
    // 自サーバーの招待コードなど、除外したい招待コードをカンマ区切りで指定
    allowlist: optionalList('AUTOMOD_INVITE_ALLOWLIST'),
  },
  // 招待リンクの「作成」自体のスパム対策(荒らしがレイド用に大量発行するのを防ぐ)
  inviteCreate: {
    limit: optionalInt('AUTOMOD_INVITE_CREATE_LIMIT', 5),
    windowMs: optionalInt('AUTOMOD_INVITE_CREATE_WINDOW_MS', 60_000),
  },
  // 1メッセージ中のURL数の上限(招待リンク以外の広告/フィッシングURL連投対策)
  url: {
    limit: optionalInt('AUTOMOD_URL_LIMIT', 5),
  },
  // 短時間で何度もニックネームを変える荒らし行為の検知
  nicknameSpam: {
    limit: optionalInt('AUTOMOD_NICKNAME_CHANGE_LIMIT', 4),
    windowMs: optionalInt('AUTOMOD_NICKNAME_CHANGE_WINDOW_MS', 60_000),
  },
  // アンチNuke: 乗っ取られたアカウント等によるチャンネル/ロールの大量削除を検知してBAN
  antiNuke: {
    enabled: optionalBool('AUTOMOD_ANTI_NUKE_ENABLED', true),
    limit: optionalInt('AUTOMOD_ANTI_NUKE_LIMIT', 3),
    windowMs: optionalInt('AUTOMOD_ANTI_NUKE_WINDOW_MS', 20_000),
  },
  scamLink: {
    block: optionalBool('AUTOMOD_BLOCK_SCAM_LINKS', true),
    extraKeywords: optionalList('AUTOMOD_SCAM_EXTRA_KEYWORDS'),
  },
  bannedWords: optionalList('AUTOMOD_BANNED_WORDS'),
  severeBannedWords: optionalList('AUTOMOD_SEVERE_BANNED_WORDS'),
  bannedWordsRegex: optional('AUTOMOD_BANNED_WORDS_REGEX'),

  raid: {
    joinLimit: optionalInt('AUTOMOD_RAID_JOIN_LIMIT', 10),
    joinWindowMs: optionalInt('AUTOMOD_RAID_JOIN_WINDOW_MS', 10_000),
    // レイド検知時にサーバー認証レベルを自動的に最高まで引き上げるか
    autoLockdown: optionalBool('AUTOMOD_RAID_AUTO_LOCKDOWN', false),
  },
  newAccount: {
    // これより新しいアカウントの参加を検知する(0=無効)
    minAgeMs: optionalInt('AUTOMOD_MIN_ACCOUNT_AGE_MS', 0),
    // flag: ログのみ / kick: 自動キック
    action: (optional('AUTOMOD_NEW_ACCOUNT_ACTION') === 'kick' ? 'kick' : 'flag') as 'flag' | 'kick',
  },
  suspiciousUsername: {
    enabled: optionalBool('AUTOMOD_FLAG_SUSPICIOUS_USERNAME', true),
  },
  // 1メッセージあたりの最大文字数(超過分は荒らし目的の長文とみなして削除。0で無効)
  maxMessageLength: optionalInt('AUTOMOD_MAX_MESSAGE_LENGTH', 0),
  // メッセージの編集・削除をログに残す(荒らしの「投稿してすぐ削除」対策)。
  // 通常運用では頻度が高くログが埋まりやすいため既定は無効
  messageAudit: {
    logEdits: optionalBool('LOG_MESSAGE_EDITS', false),
    logDeletes: optionalBool('LOG_MESSAGE_DELETES', false),
  },
  // このチャンネルでは自動検知を一切行わない(bot-commands/nsfw-text等の運用チャンネル向け)
  exemptChannelIds: optionalList('AUTOMOD_EXEMPT_CHANNEL_IDS'),
  // 名指しでブロックするドメイン(詐欺サイト・出会い系・違法賭博等をピンポイントで遮断。
  // サブドメインも含めて一致させる)
  blockedDomains: optionalList('AUTOMOD_BLOCKED_DOMAINS'),
  // 危険/迷惑になりやすい添付ファイルの拡張子を自動削除(実行ファイル等)
  blockedAttachmentExtensions: optionalList('AUTOMOD_BLOCKED_ATTACHMENT_EXTENSIONS'),
  // NGワード判定の前に、全角/半角統一・記号除去・repeated文字の圧縮などの正規化を行い、
  // 「ｂ a‌d」「b.a.d」のような回避目的の装飾をすり抜けにくくする
  normalizeBannedWordMatching: optionalBool('AUTOMOD_NORMALIZE_BANNED_WORDS', true),
};
