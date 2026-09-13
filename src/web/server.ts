import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cookieSession from 'cookie-session';
import type { Client } from 'discord.js';
import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import { config } from '../config.js';
import { getCasesSince, getOrCreatePersistedSessionSecret, getRecentCases } from '../data/db.js';
import { getEffectiveSettings, updateSettingByKey } from './configBridge.js';
import { webConfig } from './config.js';
import { consumeLoginCode } from './loginCodes.js';
import { SETTINGS_SCHEMA } from './settingsSchema.js';

// @types/cookie-session は CookieSessionObject をグローバル名前空間に宣言しているため、
// 'declare module' ではなく 'declare global' 側でマージする必要がある
declare global {
  namespace CookieSessionInterfaces {
    interface CookieSessionObject {
      userId?: string;
      username?: string;
    }
  }
}

const PUBLIC_DIR = fileURLToPath(new URL('./public', import.meta.url));

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.session?.userId) {
    next();
    return;
  }
  res.status(401).json({ error: '認証が必要です' });
}

function renderLoginPage(error?: string): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Rula_KuraBot 管理画面ログイン</title>
<link rel="stylesheet" href="/style.css" />
<style>
  .login-wrap { max-width: 420px; margin: 80px auto; padding: 0 20px; }
  .login-wrap h1 { font-size: 20px; margin-bottom: 8px; }
  .login-wrap p { color: var(--text-muted); font-size: 14px; line-height: 1.6; }
  .login-wrap form { margin-top: 20px; display: flex; gap: 8px; }
  .login-wrap input { flex: 1; font-size: 18px; letter-spacing: 4px; text-align: center; padding: 10px; border-radius: 6px; border: 1px solid var(--border); background: var(--bg-elevated); color: var(--text); }
  .login-wrap button { padding: 10px 20px; border-radius: 6px; border: none; background: var(--accent); color: white; cursor: pointer; font-size: 14px; }
  .login-error { color: var(--danger); margin-top: 12px; font-size: 13px; }
</style>
</head>
<body>
<div class="login-wrap">
  <h1>Rula_KuraBot 管理画面</h1>
  <p>Discordサーバーで <code>/admin-login</code> コマンドを実行すると、
  ワンタイムコードが表示されます(管理者権限を持つメンバーのみ実行可能)。
  発行から5分以内に、そのコードを下に入力してください。</p>
  <form method="POST" action="/login">
    <input type="text" name="code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" placeholder="000000" autofocus required />
    <button type="submit">ログイン</button>
  </form>
  ${error ? `<p class="login-error">${error}</p>` : ''}
</div>
</body>
</html>`;
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

  // SESSION_SECRETが未設定でも、再起動のたびにログインが無効化され続けないよう
  // DBに永久保存した値を使い回す
  const sessionSecret = webConfig.sessionSecretFromEnv ?? (await getOrCreatePersistedSessionSecret());
  if (!webConfig.sessionSecretFromEnv) {
    console.log('[web] SESSION_SECRET未設定のため、data/db.jsonに保存した鍵を使用します(再起動しても維持されます)');
  }

  const app = express();
  // リバースプロキシ(MrtCloud等)配下でクッキーのSecure属性やIP判定を正しく扱うために必要
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  // サーバー側にセッションを持たない、署名付きCookieのみの方式。プロセス再起動があっても
  // ログイン状態が失われない
  app.use(
    cookieSession({
      name: 'session',
      keys: [sessionSecret],
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: 'lax',
      secure: webConfig.baseUrl.startsWith('https://'),
    }),
  );

  // キャッシュ経由で古いページ/Cookieが再生されるのを防ぐ
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
      res.status(401).send(renderLoginPage('コードが無効か、有効期限が切れています。Discordで /admin-login を実行し直してください。'));
      return;
    }

    req.session = { userId: entry.userId, username: entry.username };
    res.redirect('/');
  });

  app.get('/logout', (req, res) => {
    req.session = null;
    res.redirect('/login');
  });

  app.get('/api/me', requireAuth, (req, res) => {
    res.json({ userId: req.session?.userId, username: req.session?.username });
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

  app.get('/', (req, res) => {
    if (!req.session?.userId) {
      res.redirect('/login');
      return;
    }
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  });

  app.listen(webConfig.port, webConfig.host, () => {
    console.log(`[web] 管理画面を起動しました: ${webConfig.baseUrl} (${webConfig.host}:${webConfig.port})`);
  });
}
