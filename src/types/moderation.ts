export type Severity = 'minor' | 'moderate' | 'severe';

export interface ActionMeta {
  label: string;
  severity: Severity;
}

/**
 * モデレーション行為の一覧。新しい行為を追加する場合はここにエントリを足すだけでよい。
 * severity に応じて送信先チャンネル(環境変数)とメンション有無が自動的に決まる。
 */
export const ACTIONS = {
  WARN: { label: '警告', severity: 'minor' },
  NICKNAME_RESET: { label: 'ニックネームリセット', severity: 'minor' },
  VOICE_MUTE: { label: 'サーバーミュート', severity: 'minor' },
  VOICE_UNMUTE: { label: 'サーバーミュート解除', severity: 'minor' },
  SLOWMODE: { label: 'スローモード変更', severity: 'minor' },

  TIMEOUT: { label: 'タイムアウト', severity: 'moderate' },
  UNTIMEOUT: { label: 'タイムアウト解除', severity: 'moderate' },
  KICK: { label: 'キック', severity: 'moderate' },
  VOICE_DEAFEN: { label: 'サーバースピーカーミュート', severity: 'moderate' },
  VOICE_UNDEAFEN: { label: 'サーバースピーカーミュート解除', severity: 'moderate' },
  LOCK: { label: 'チャンネルロック', severity: 'moderate' },
  UNLOCK: { label: 'チャンネルロック解除', severity: 'moderate' },
  PURGE: { label: 'メッセージ一括削除', severity: 'moderate' },

  BAN: { label: 'BAN', severity: 'severe' },
  UNBAN: { label: 'BAN解除', severity: 'severe' },
  SOFTBAN: { label: 'ソフトBAN', severity: 'severe' },
  RAID_LOCKDOWN_ON: { label: 'サーバーロックダウン開始(手動)', severity: 'severe' },
  RAID_LOCKDOWN_OFF: { label: 'サーバーロックダウン解除(手動)', severity: 'severe' },

  // --- ここから自動検知(荒らし対策) ---
  AUTO_DUPLICATE_SPAM: { label: '連投スパム', severity: 'moderate' },
  AUTO_CROSSPOST_SPAM: { label: 'チャンネル横断スパム', severity: 'moderate' },
  AUTO_MESSAGE_FLOOD: { label: 'メッセージフラッド', severity: 'moderate' },
  AUTO_ATTACHMENT_FLOOD: { label: '添付ファイルフラッド', severity: 'moderate' },
  AUTO_MASS_MENTION: { label: 'メンションスパム', severity: 'moderate' },
  AUTO_INVITE_LINK: { label: '無許可の招待リンク', severity: 'moderate' },
  AUTO_SCAM_LINK: { label: '詐欺・フィッシングの疑いがあるリンク', severity: 'severe' },
  AUTO_BANNED_WORD: { label: 'NGワード', severity: 'minor' },
  AUTO_BANNED_WORD_SEVERE: { label: '重大NGワード', severity: 'severe' },
  AUTO_CAPS_SPAM: { label: '大文字乱用', severity: 'minor' },
  AUTO_EMOJI_SPAM: { label: '絵文字乱用', severity: 'minor' },
  AUTO_ZALGO_TEXT: { label: '装飾(Zalgo)テキスト', severity: 'minor' },
  AUTO_RAID_JOIN_SPIKE: { label: 'レイドの疑いがある参加急増', severity: 'severe' },
  AUTO_NEW_ACCOUNT_JOIN: { label: '新規アカウントの参加', severity: 'minor' },
  AUTO_SUSPICIOUS_USERNAME: { label: '不審なユーザー名(量産アカウントの疑い)', severity: 'minor' },
  AUTO_INVITE_CREATE_FLOOD: { label: '招待リンク作成スパム', severity: 'moderate' },
  AUTO_URL_SPAM: { label: 'URL大量投稿', severity: 'moderate' },
  AUTO_NICKNAME_SPAM: { label: 'ニックネーム変更スパム', severity: 'minor' },
  AUTO_NUKE_ATTEMPT: { label: 'サーバー破壊行為の疑い(チャンネル/ロール大量削除)', severity: 'severe' },
  AUTO_MESSAGE_TOO_LONG: { label: '長文メッセージ', severity: 'minor' },
  AUTO_BLOCKED_DOMAIN: { label: '禁止ドメインへのリンク', severity: 'moderate' },
  AUTO_BLOCKED_ATTACHMENT: { label: '危険な添付ファイル', severity: 'moderate' },

  // --- メッセージ監査ログ ---
  MESSAGE_EDITED: { label: 'メッセージ編集', severity: 'minor' },
  MESSAGE_DELETED: { label: 'メッセージ削除', severity: 'minor' },
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
