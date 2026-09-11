export type Severity = 'minor' | 'moderate' | 'severe';

export interface ActionMeta {
  label: string;
  emoji: string;
  severity: Severity;
}

/**
 * モデレーション行為の一覧。新しい行為を追加する場合はここにエントリを足すだけでよい。
 * severity に応じて送信先チャンネル(環境変数)とメンション有無が自動的に決まる。
 */
export const ACTIONS = {
  WARN: { label: '警告', emoji: '⚠️', severity: 'minor' },
  NICKNAME_RESET: { label: 'ニックネームリセット', emoji: '🪪', severity: 'minor' },
  VOICE_MUTE: { label: 'サーバーミュート', emoji: '🔇', severity: 'minor' },
  VOICE_UNMUTE: { label: 'サーバーミュート解除', emoji: '🔊', severity: 'minor' },
  SLOWMODE: { label: 'スローモード変更', emoji: '🐌', severity: 'minor' },

  TIMEOUT: { label: 'タイムアウト', emoji: '⏳', severity: 'moderate' },
  UNTIMEOUT: { label: 'タイムアウト解除', emoji: '⏳', severity: 'moderate' },
  KICK: { label: 'キック', emoji: '👢', severity: 'moderate' },
  VOICE_DEAFEN: { label: 'サーバースピーカーミュート', emoji: '🙉', severity: 'moderate' },
  VOICE_UNDEAFEN: { label: 'サーバースピーカーミュート解除', emoji: '👂', severity: 'moderate' },
  LOCK: { label: 'チャンネルロック', emoji: '🔒', severity: 'moderate' },
  UNLOCK: { label: 'チャンネルロック解除', emoji: '🔓', severity: 'moderate' },
  PURGE: { label: 'メッセージ一括削除', emoji: '🧹', severity: 'moderate' },

  BAN: { label: 'BAN', emoji: '🔨', severity: 'severe' },
  UNBAN: { label: 'BAN解除', emoji: '🕊️', severity: 'severe' },
  SOFTBAN: { label: 'ソフトBAN', emoji: '💥', severity: 'severe' },
  RAID_LOCKDOWN_ON: { label: 'サーバーロックダウン開始(手動)', emoji: '🚨', severity: 'severe' },
  RAID_LOCKDOWN_OFF: { label: 'サーバーロックダウン解除(手動)', emoji: '✅', severity: 'severe' },

  // --- ここから自動検知(荒らし対策) ---
  AUTO_DUPLICATE_SPAM: { label: '連投スパム', emoji: '🔁', severity: 'moderate' },
  AUTO_CROSSPOST_SPAM: { label: 'チャンネル横断スパム', emoji: '📢', severity: 'moderate' },
  AUTO_MESSAGE_FLOOD: { label: 'メッセージフラッド', emoji: '🌊', severity: 'moderate' },
  AUTO_ATTACHMENT_FLOOD: { label: '添付ファイルフラッド', emoji: '📎', severity: 'moderate' },
  AUTO_MASS_MENTION: { label: 'メンションスパム', emoji: '📣', severity: 'moderate' },
  AUTO_INVITE_LINK: { label: '無許可の招待リンク', emoji: '🔗', severity: 'moderate' },
  AUTO_SCAM_LINK: { label: '詐欺・フィッシングの疑いがあるリンク', emoji: '🎣', severity: 'severe' },
  AUTO_BANNED_WORD: { label: 'NGワード', emoji: '🚫', severity: 'minor' },
  AUTO_BANNED_WORD_SEVERE: { label: '重大NGワード', emoji: '☣️', severity: 'severe' },
  AUTO_CAPS_SPAM: { label: '大文字乱用', emoji: '🔠', severity: 'minor' },
  AUTO_EMOJI_SPAM: { label: '絵文字乱用', emoji: '🤡', severity: 'minor' },
  AUTO_ZALGO_TEXT: { label: '装飾(Zalgo)テキスト', emoji: '👾', severity: 'minor' },
  AUTO_RAID_JOIN_SPIKE: { label: 'レイドの疑いがある参加急増', emoji: '🚨', severity: 'severe' },
  AUTO_NEW_ACCOUNT_JOIN: { label: '新規アカウントの参加', emoji: '🐣', severity: 'minor' },
  AUTO_SUSPICIOUS_USERNAME: { label: '不審なユーザー名(量産アカウントの疑い)', emoji: '🕵️', severity: 'minor' },
  AUTO_INVITE_CREATE_FLOOD: { label: '招待リンク作成スパム', emoji: '🧨', severity: 'moderate' },
  AUTO_URL_SPAM: { label: 'URL大量投稿', emoji: '🔗', severity: 'moderate' },
  AUTO_NICKNAME_SPAM: { label: 'ニックネーム変更スパム', emoji: '🪄', severity: 'minor' },
  AUTO_NUKE_ATTEMPT: { label: 'サーバー破壊行為の疑い(チャンネル/ロール大量削除)', emoji: '💣', severity: 'severe' },
} as const satisfies Record<string, ActionMeta>;

export type ActionKey = keyof typeof ACTIONS;

export const SEVERITY_LABEL: Record<Severity, string> = {
  minor: '軽度',
  moderate: '中度',
  severe: '重度',
};

export const SEVERITY_COLOR: Record<Severity, number> = {
  minor: 0xf1c40f,
  moderate: 0xe67e22,
  severe: 0xe74c3c,
};
