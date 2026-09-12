import crypto from 'node:crypto';
import { optional, optionalBool, optionalInt } from '../config.js';

// ホスティングパネル(MrtCloud等)は PORT / HOST 環境変数でリッスンすべきポート・アドレスを
// 割り当ててくることが多いので、それらを優先する。ADMIN_PANEL_PORT はローカル開発など
// パネルの指定がない環境向けの上書き手段として残す。
const port = optionalInt('PORT', optionalInt('ADMIN_PANEL_PORT', 3000));
// 127.0.0.1/localhostにすると外部からアクセスできないパネルが多いため既定は0.0.0.0にする
const host = optional('HOST') ?? '0.0.0.0';
const sessionSecretFromEnv = optional('SESSION_SECRET');

export const webConfig = {
  enabled: optionalBool('ADMIN_PANEL_ENABLED', true),
  port,
  host,
  baseUrl: optional('ADMIN_PANEL_BASE_URL') ?? `http://localhost:${port}`,
  clientSecret: optional('DISCORD_CLIENT_SECRET'),
  sessionSecret: sessionSecretFromEnv ?? crypto.randomBytes(32).toString('hex'),
  sessionSecretIsGenerated: !sessionSecretFromEnv,
};
