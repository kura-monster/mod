import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Client } from 'discord.js';
import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import { config } from '../config.js';
import { createAuthToken, verifyAuthToken } from './authTokens.js';
import { getCasesSince, getOrCreatePersistedSessionSecret, getRecentCases } from '../data/db.js';
import { getEffectiveSettings, updateSettingByKey } from './configBridge.js';
import { webConfig } from './config.js';
import { consumeLoginCode } from './loginCodes.js';
import { SETTINGS_SCHEMA } from './settingsSchema.js';

declare global {
  namespace Express {
    interface Request {
      authUser?: { userId: string; username: string };
    }
  }
}

const PUBLIC_DIR = fileURLToPath(new URL('./public', import.meta.url));

function renderLoginPage(): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Rula_KuraBot 管理画面ログイン</title>
<link rel="stylesheet" href="/style.css" />
<link rel="stylesheet" href="/login.css" />
</head>
<body>
<div class="login-wrap">
  <h1>Rula_KuraBot 管理画面</h1>
  <p>Discordサーバーで <code>/admin-login</code> コマンドを実行すると、
  ワンタイムコードが表示されます(管理者権限を持つメンバーのみ実行可能)。
  発行から5分以内に、そのコードを下に入力してください。</p>
  <form id="login-form" method="POST" action="/login">
    <input type="text" name="code" id="code-input" inputmode="numeric" placeholder="000000" autofocus required autocomplete="one-time-code" />
    <button type="submit">ログイン</button>
  </form>
  <p class="login-error" id="login-error"></p>
</div>
<script src="/login.js"></script>
</body>
</html>`;
}

function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim();
}

export async function startWebPanel(client: Client): Promise<void> {
  if (!webConfig.enabled) {
    console.log('[web] 管理画面は無効化されています(ADMIN_PANEL_ENABLED=false)');
    return;
  }
  if (!config.guildId) {
    console.error('[web] GUILD_ID が未設定のため管理画面を起動できません(対象サーバーの指定が必要)');
    return;
  }

  // このトークン署名鍵はSESSION_SECRET未設定時、data/db.jsonに永久保存した値を使い回す
  const secret = webConfig.sessionSecretFromEnv ?? (await getOrCreatePersistedSessionSecret());
  if (!webConfig.sessionSecretFromEnv) {
    console.log('[web] SESSION_SECRET未設定のため、data/db.jsonに保存した鍵を使用します(再起動しても維持されます)');
  }

  function requireAuth(req: Request, res: Response, next: NextFunction): void {
    const token = getBearerToken(req);
    const payload = token ? verifyAuthToken(token, secret) : null;
    if (!payload) {
      res.status(401).json({ error: '認証が必要です' });
      return;
    }
    req.authUser = { userId: payload.userId, username: payload.username };
    next();
  }

  const app = express();
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(express.json());
  // login-form.jsが読み込めない万一の場合に備え、素のHTMLフォーム送信(urlencoded)でも
  // 動くようにしておく(通常はJSがJSONで/loginにfetchする)
  app.use(express.urlencoded({ extended: false }));

  // キャッシュ経由で古いページが再生されるのを防ぐ
  app.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    next();
  });

  app.get('/login', (_req, res) => {
    res.send(renderLoginPage());
  });

  app.post('/login', (req, res) => {
    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
    const entry = consumeLoginCode(code);

    if (!entry) {
      res.status(401).json({ error: 'コードが無効か、有効期限が切れています。Discordで /admin-login を実行し直してください。' });
      return;
    }

    const token = createAuthToken(entry.userId, entry.username, secret);
    res.json({ token, username: entry.username });
  });

  app.get('/api/me', requireAuth, (req, res) => {
    res.json({ userId: req.authUser?.userId, username: req.authUser?.username });
  });

  app.get('/api/settings', requireAuth, (_req, res) => {
    res.json({ schema: SETTINGS_SCHEMA, values: getEffectiveSettings() });
  });

  app.patch('/api/settings', requireAuth, async (req, res) => {
    const { key, value } = (req.body ?? {}) as { key?: unknown; value?: unknown };
    if (typeof key !== 'string') {
      res.status(400).json({ error: 'keyが必要です' });
      return;
    }

    try {
      await updateSettingByKey(key, value);
      res.json({ ok: true, values: getEffectiveSettings() });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : '更新に失敗しました' });
    }
  });

  app.get('/api/stats', requireAuth, async (req, res) => {
    const days = Math.min(Math.max(Number(req.query.days ?? 7), 1), 90);
    const cases = await getCasesSince(config.guildId!, Date.now() - days * 24 * 60 * 60 * 1000);

    const bySeverity: Record<string, number> = {};
    const byModerator = new Map<string, number>();
    for (const c of cases) {
      bySeverity[c.severity] = (bySeverity[c.severity] ?? 0) + 1;
      byModerator.set(c.moderatorId, (byModerator.get(c.moderatorId) ?? 0) + 1);
    }

    res.json({
      days,
      total: cases.length,
      bySeverity,
      topModerators: [...byModerator.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([moderatorId, count]) => ({ moderatorId, count })),
    });
  });

  app.get('/api/cases', requireAuth, async (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit ?? 50), 1), 200);
    const cases = await getRecentCases(config.guildId!, limit);
    res.json({ cases });
  });

  app.use(express.static(PUBLIC_DIR, { index: false }));

  // 認証確認はクライアント側のJS(/api/meへの呼び出し)で行うため、ここでは無条件で返す
  app.get('/', (_req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  });

  app.listen(webConfig.port, webConfig.host, () => {
    console.log(`[web] 管理画面を起動しました: ${webConfig.baseUrl} (${webConfig.host}:${webConfig.port})`);
  });
}
