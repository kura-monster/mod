export interface ModerationCaseRecord {
  id: number;
  guildId: string;
  action: string;
  severity: string;
  moderatorId: string;
  moderatorTag: string;
  targetId?: string;
  targetLabel: string;
  reason: string;
  timestamp: number;
}

export interface WarningRecord {
  id: number;
  moderatorId: string;
  reason: string;
  timestamp: number;
}

export interface ReportRecord {
  id: number;
  guildId: string;
  reporterId: string;
  reporterTag: string;
  targetId: string;
  targetTag: string;
  reason: string;
  messageLink?: string;
  timestamp: number;
}

export interface DatabaseSchema {
  nextCaseId: number;
  nextWarningId: number;
  nextReportId: number;
  cases: ModerationCaseRecord[];
  // guildId -> userId -> warnings
  warnings: Record<string, Record<string, WarningRecord[]>>;
  reports: ReportRecord[];
  // guildId -> ロックダウン前のサーバー参加認証レベル
  lockdown: Record<string, number>;
  // 管理画面から変更された設定値の上書き(キーは settingsSchema.ts の SettingField.key)
  settingsOverrides: Record<string, unknown>;
  // SESSION_SECRET未設定時に使う、再起動をまたいで安定させるためのセッション署名鍵
  sessionSecret?: string;
}
