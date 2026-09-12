export type SettingType = 'string' | 'number' | 'boolean' | 'stringList' | 'channel' | 'role' | 'select';

export interface SettingField {
  /** config.ts / automod/config.ts の値へのドットパス。'automod.'で始まるものは automodConfig を指す */
  key: string;
  /** 対応する環境変数名(表示用。管理画面での変更は環境変数の初期値を上書きする) */
  envVar: string;
  label: string;
  description?: string;
  type: SettingType;
  group: string;
  options?: string[];
}

export const SETTINGS_SCHEMA: SettingField[] = [
  // --- 入退室ログ / モデレーションログ ---
  { key: 'joinLogChannelId', envVar: 'JOIN_LOG_CHANNEL_ID', label: '入室ログ送信先チャンネルID', type: 'channel', group: '入退室ログ' },
  { key: 'leaveLogChannelId', envVar: 'LEAVE_LOG_CHANNEL_ID', label: '退出ログ送信先チャンネルID', type: 'channel', group: '入退室ログ' },
  {
    key: 'moderatorRoleId',
    envVar: 'MODERATOR_ROLE_ID',
    label: '重度ログでメンションするロールID',
    type: 'role',
    group: 'モデレーションログ',
  },
  {
    key: 'modLogChannelId.minor',
    envVar: 'MOD_LOG_MINOR_CHANNEL_ID',
    label: '軽度ログ送信先チャンネルID',
    type: 'channel',
    group: 'モデレーションログ',
  },
  {
    key: 'modLogChannelId.moderate',
    envVar: 'MOD_LOG_MODERATE_CHANNEL_ID',
    label: '中度ログ送信先チャンネルID',
    type: 'channel',
    group: 'モデレーションログ',
  },
  {
    key: 'modLogChannelId.severe',
    envVar: 'MOD_LOG_SEVERE_CHANNEL_ID',
    label: '重度ログ送信先チャンネルID',
    type: 'channel',
    group: 'モデレーションログ',
  },

  // --- 鯖タグ連動ロール ---
  {
    key: 'serverTag.guildId',
    envVar: 'SERVER_TAG_GUILD_ID',
    label: 'どのサーバーの鯖タグを見るか(未設定でGUILD_IDと同じ)',
    type: 'string',
    group: '鯖タグ連動ロール',
  },
  {
    key: 'serverTag.roleId',
    envVar: 'SERVER_TAG_ROLE_ID',
    label: '鯖タグ着用者に自動付与/非着用時に自動剥奪するロールID',
    type: 'role',
    group: '鯖タグ連動ロール',
  },

  // --- 自動検知 全体 ---
  { key: 'automod.enabled', envVar: 'AUTOMOD_ENABLED', label: '自動検知を有効にする', type: 'boolean', group: '自動検知 全体' },
  {
    key: 'automod.logOnly',
    envVar: 'AUTOMOD_LOG_ONLY',
    label: 'ログのみモード(削除/タイムアウト/BAN等の自動対応をしない)',
    type: 'boolean',
    group: '自動検知 全体',
  },
  {
    key: 'automod.exemptRoleIds',
    envVar: 'AUTOMOD_EXEMPT_ROLE_IDS',
    label: '除外ロールID(カンマ区切り相当、複数指定可)',
    type: 'stringList',
    group: '自動検知 全体',
  },

  // --- スパム/フラッド検知 ---
  { key: 'automod.duplicate.limit', envVar: 'AUTOMOD_DUPLICATE_LIMIT', label: '連投スパム: 回数', type: 'number', group: 'スパム検知' },
  {
    key: 'automod.duplicate.windowMs',
    envVar: 'AUTOMOD_DUPLICATE_WINDOW_MS',
    label: '連投スパム: 時間幅(ミリ秒)',
    type: 'number',
    group: 'スパム検知',
  },
  {
    key: 'automod.crosspost.channelLimit',
    envVar: 'AUTOMOD_CROSSPOST_CHANNEL_LIMIT',
    label: 'クロスポスト: チャンネル数',
    type: 'number',
    group: 'スパム検知',
  },
  {
    key: 'automod.crosspost.windowMs',
    envVar: 'AUTOMOD_CROSSPOST_WINDOW_MS',
    label: 'クロスポスト: 時間幅(ミリ秒)',
    type: 'number',
    group: 'スパム検知',
  },
  { key: 'automod.flood.limit', envVar: 'AUTOMOD_FLOOD_LIMIT', label: 'メッセージフラッド: 件数', type: 'number', group: 'スパム検知' },
  {
    key: 'automod.flood.windowMs',
    envVar: 'AUTOMOD_FLOOD_WINDOW_MS',
    label: 'メッセージフラッド: 時間幅(ミリ秒)',
    type: 'number',
    group: 'スパム検知',
  },
  {
    key: 'automod.attachment.limit',
    envVar: 'AUTOMOD_ATTACHMENT_LIMIT',
    label: '添付ファイルフラッド: 件数',
    type: 'number',
    group: 'スパム検知',
  },
  {
    key: 'automod.attachment.windowMs',
    envVar: 'AUTOMOD_ATTACHMENT_WINDOW_MS',
    label: '添付ファイルフラッド: 時間幅(ミリ秒)',
    type: 'number',
    group: 'スパム検知',
  },
  { key: 'automod.mention.limit', envVar: 'AUTOMOD_MENTION_LIMIT', label: 'メンションスパム: 上限件数', type: 'number', group: 'スパム検知' },
  { key: 'automod.url.limit', envVar: 'AUTOMOD_URL_LIMIT', label: 'URL大量投稿: 上限件数', type: 'number', group: 'スパム検知' },
  { key: 'automod.emoji.limit', envVar: 'AUTOMOD_EMOJI_LIMIT', label: '絵文字乱用: 上限個数', type: 'number', group: 'スパム検知' },
  {
    key: 'automod.caps.minLength',
    envVar: 'AUTOMOD_CAPS_MIN_LENGTH',
    label: '大文字乱用: 判定を行う最低文字数',
    type: 'number',
    group: 'スパム検知',
  },
  {
    key: 'automod.caps.ratio',
    envVar: 'AUTOMOD_CAPS_RATIO',
    label: '大文字乱用: 比率の閾値(0〜1)',
    type: 'number',
    group: 'スパム検知',
  },
  { key: 'automod.zalgo.enabled', envVar: 'AUTOMOD_BLOCK_ZALGO', label: 'Zalgoテキスト検知を有効にする', type: 'boolean', group: 'スパム検知' },
  {
    key: 'automod.zalgo.maxMarksPerChar',
    envVar: 'AUTOMOD_ZALGO_MAX_MARKS_PER_CHAR',
    label: 'Zalgo: 1文字あたりの結合文字数の閾値',
    type: 'number',
    group: 'スパム検知',
  },

  // --- リンク/招待 ---
  {
    key: 'automod.invite.block',
    envVar: 'AUTOMOD_BLOCK_INVITE_LINKS',
    label: '無許可のDiscord招待リンク投稿をブロックする',
    type: 'boolean',
    group: 'リンク・招待',
  },
  {
    key: 'automod.invite.allowlist',
    envVar: 'AUTOMOD_INVITE_ALLOWLIST',
    label: '許可する招待コード(自サーバーの招待など)',
    type: 'stringList',
    group: 'リンク・招待',
  },
  {
    key: 'automod.inviteCreate.limit',
    envVar: 'AUTOMOD_INVITE_CREATE_LIMIT',
    label: '招待リンク作成スパム: 件数',
    type: 'number',
    group: 'リンク・招待',
  },
  {
    key: 'automod.inviteCreate.windowMs',
    envVar: 'AUTOMOD_INVITE_CREATE_WINDOW_MS',
    label: '招待リンク作成スパム: 時間幅(ミリ秒)',
    type: 'number',
    group: 'リンク・招待',
  },
  {
    key: 'automod.scamLink.block',
    envVar: 'AUTOMOD_BLOCK_SCAM_LINKS',
    label: '詐欺・フィッシングリンクをブロックする',
    type: 'boolean',
    group: 'リンク・招待',
  },
  {
    key: 'automod.scamLink.extraKeywords',
    envVar: 'AUTOMOD_SCAM_EXTRA_KEYWORDS',
    label: '詐欺検知の追加キーワード',
    type: 'stringList',
    group: 'リンク・招待',
  },

  // --- NGワード ---
  { key: 'automod.bannedWords', envVar: 'AUTOMOD_BANNED_WORDS', label: 'NGワード(通常)', type: 'stringList', group: 'NGワード' },
  {
    key: 'automod.severeBannedWords',
    envVar: 'AUTOMOD_SEVERE_BANNED_WORDS',
    label: 'NGワード(重大、検知で即キック)',
    type: 'stringList',
    group: 'NGワード',
  },
  {
    key: 'automod.bannedWordsRegex',
    envVar: 'AUTOMOD_BANNED_WORDS_REGEX',
    label: 'NGワード用の追加正規表現',
    type: 'string',
    group: 'NGワード',
  },

  // --- ニックネームスパム ---
  {
    key: 'automod.nicknameSpam.limit',
    envVar: 'AUTOMOD_NICKNAME_CHANGE_LIMIT',
    label: 'ニックネーム変更スパム: 回数',
    type: 'number',
    group: 'ニックネームスパム',
  },
  {
    key: 'automod.nicknameSpam.windowMs',
    envVar: 'AUTOMOD_NICKNAME_CHANGE_WINDOW_MS',
    label: 'ニックネーム変更スパム: 時間幅(ミリ秒)',
    type: 'number',
    group: 'ニックネームスパム',
  },

  // --- レイド対策 ---
  { key: 'automod.raid.joinLimit', envVar: 'AUTOMOD_RAID_JOIN_LIMIT', label: 'レイド検知: 参加人数', type: 'number', group: 'レイド対策' },
  {
    key: 'automod.raid.joinWindowMs',
    envVar: 'AUTOMOD_RAID_JOIN_WINDOW_MS',
    label: 'レイド検知: 時間幅(ミリ秒)',
    type: 'number',
    group: 'レイド対策',
  },
  {
    key: 'automod.raid.autoLockdown',
    envVar: 'AUTOMOD_RAID_AUTO_LOCKDOWN',
    label: 'レイド検知時に自動でサーバーをロックダウンする',
    type: 'boolean',
    group: 'レイド対策',
  },
  {
    key: 'automod.newAccount.minAgeMs',
    envVar: 'AUTOMOD_MIN_ACCOUNT_AGE_MS',
    label: '新規アカウント判定の閾値(ミリ秒、0で無効)',
    type: 'number',
    group: 'レイド対策',
  },
  {
    key: 'automod.newAccount.action',
    envVar: 'AUTOMOD_NEW_ACCOUNT_ACTION',
    label: '新規アカウント検知時の対応',
    type: 'select',
    options: ['flag', 'kick'],
    group: 'レイド対策',
  },
  {
    key: 'automod.suspiciousUsername.enabled',
    envVar: 'AUTOMOD_FLAG_SUSPICIOUS_USERNAME',
    label: '不審なユーザー名(量産アカウント疑い)を検知する',
    type: 'boolean',
    group: 'レイド対策',
  },

  // --- アンチNuke ---
  { key: 'automod.antiNuke.enabled', envVar: 'AUTOMOD_ANTI_NUKE_ENABLED', label: 'アンチNukeを有効にする', type: 'boolean', group: 'アンチNuke' },
  { key: 'automod.antiNuke.limit', envVar: 'AUTOMOD_ANTI_NUKE_LIMIT', label: 'アンチNuke: 削除回数', type: 'number', group: 'アンチNuke' },
  {
    key: 'automod.antiNuke.windowMs',
    envVar: 'AUTOMOD_ANTI_NUKE_WINDOW_MS',
    label: 'アンチNuke: 時間幅(ミリ秒)',
    type: 'number',
    group: 'アンチNuke',
  },
];

export function findSettingField(key: string): SettingField | undefined {
  return SETTINGS_SCHEMA.find((field) => field.key === key);
}
