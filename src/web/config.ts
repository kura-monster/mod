import { optional, optionalBool, optionalInt } from '../config.js';

// ホスティングパネル(MrtCloud等)は PORT / HOST 環境変数でリッスンすべきポート・アドレスを
// 割り当ててくることが多いので、それらを優先する。ADMIN_PANEL_PORT はローカル開発など
// パネルの指定がない環境向けの上書き手段として残す。
const port = optionalInt('PORT', optionalInt('ADMIN_PANEL_PORT', 3000));
// 127.0.0.1/localhostにすると外部からアクセスできないパネルが多いため既定は0.0.0.0にする
const host = optional('HOST') ?? '0.0.0.0';

export const webConfig = {
  enabled: optionalBool('ADMIN_PANEL_ENABLED', true),
  port,
  host,
  // /admin-loginコマンドの返信でログインURLを案内する際に使う(未設定でもログイン自体は可能)
  baseUrl: optional('ADMIN_PANEL_BASE_URL') ?? `http://localhost:${port}`,
  // 未設定の場合は data/db.json に永久保存された値を使う(server.tsで解決する)
  sessionSecretFromEnv: optional('SESSION_SECRET'),
};
