import 'dotenv/config';

export function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() !== '' ? value.trim() : undefined;
}

function required(name: string): string {
  const value = optional(name);
  if (!value) {
    throw new Error(`環境変数 ${name} が設定されていません。.env を確認してください。`);
  }
  return value;
}

export function optionalInt(name: string, fallback: number): number {
  const raw = optional(name);
  if (raw === undefined) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function optionalFloat(name: string, fallback: number): number {
  const raw = optional(name);
  if (raw === undefined) return fallback;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function optionalBool(name: string, fallback: boolean): boolean {
  const raw = optional(name);
  if (raw === undefined) return fallback;
  return raw.toLowerCase() === 'true' || raw === '1';
}

export function optionalList(name: string): string[] {
  const raw = optional(name);
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

// 管理画面から実行時に変更できるよう、意図的に readonly にはしない
// (token/clientId/guildIdはDiscord側の設定と密結合なため管理画面からは変更不可にしている)
export const config = {
  token: required('DISCORD_TOKEN'),
  clientId: required('CLIENT_ID'),
  guildId: optional('GUILD_ID'),

  joinLogChannelId: optional('JOIN_LOG_CHANNEL_ID'),
  leaveLogChannelId: optional('LEAVE_LOG_CHANNEL_ID'),

  moderatorRoleId: optional('MODERATOR_ROLE_ID'),

  modLogChannelId: {
    minor: optional('MOD_LOG_MINOR_CHANNEL_ID'),
    moderate: optional('MOD_LOG_MODERATE_CHANNEL_ID'),
    severe: optional('MOD_LOG_SEVERE_CHANNEL_ID'),
  },

  serverTag: {
    // どのサーバーの鯖タグを見るか(未設定ならこのボットが動いているサーバー=GUILD_IDを対象にする)
    guildId: optional('SERVER_TAG_GUILD_ID') ?? optional('GUILD_ID'),
    // 鯖タグを着用しているメンバーに自動付与/非着用時に自動剥奪するロールID(未設定なら機能自体が無効)
    roleId: optional('SERVER_TAG_ROLE_ID'),
  },
};
