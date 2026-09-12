import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PermissionFlagsBits, type Client } from 'discord.js';
import express, { type NextFunction, type Request, type Response } from 'express';
import session from 'express-session';
import { config } from '../config.js';
import { getRecentCases, getCasesSince } from '../data/db.js';
import { getEffectiveSettings, updateSettingByKey } from './configBridge.js';
import { webConfig } from './config.js';
import { SETTINGS_SCHEMA } from './settingsSchema.js';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    username?: string;
  }
}

const DISCORD_API = 'https://discord.com/api/v10';
const PUBLIC_DIR = fileURLToPath(new URL('./public', import.meta.url));

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.session.userId) {
    next();
    return;
  }
  res.status(401).json({ error: '認証が必要です' });
}

export function startWebPanel(client: Client): void {
  if (!webConfig.enabled) {
    console.log('[web] 管理画面は無効化されています(ADMIN_PANEL_ENABLED=false)');
    return;
  }
  if (!webConfig.clientSecret) {
    console.error('[web] DISCORD_CLIENT_SECRET が未設定のため管理画面を起動できません');
    return;
  }
  if (!config.guildId) {
    console.error('[web] GUILD_ID が未設定のため管理画面を起動できません(権限確認に対象サーバーの指定が必要)');
    return;
  }
  if (webConfig.sessionSecretIsGenerated) {
    console.warn('[web] SESSION_SECRET が未設定のため、再起動のたびに管理画面のログインがリセットされます');
  }

  const app = express();
  app.use(express.json());
  app.use(
    session({
      secret: webConfig.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: webConfig.baseUrl.startsWith('https://'),
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    }),
  );

  app.get('/login', (_req, res) => {
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: `${webConfig.baseUrl}/callback`,
      response_type: 'code',
      scope: 'identify',
      prompt: 'consent',
    });
    res.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
  });

  app.get('/callback', async (req, res) => {
    const code = req.query.code;
    if (typeof code !== 'string') {
      res.status(400).send('認証コードがありません。もう一度 /login からやり直してください。');
      return;
    }

    try {
      const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: webConfig.clientSecret!,
          grant_type: 'authorization_code',
          code,
          redirect_uri: `${webConfig.baseUrl}/callback`,
        }),
      });

      if (!tokenRes.ok) {
        throw new Error(`トークン取得に失敗しました (status=${tokenRes.status})`);
      }
      const tokenData = (await tokenRes.json()) as { access_token: string };

      const userRes = await fetch(`${DISCORD_API}/users/@me`, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (!userRes.ok) {
        throw new Error(`ユーザー情報取得に失敗しました (status=${userRes.status})`);
      }
      const user = (await userRes.json()) as { id: string; username: string };

      const guild = client.guilds.cache.get(config.guildId!);
      if (!guild) {
        res
          .status(503)
          .send('ボットが対象サーバーに接続できていません。起動直後の場合は数秒待って再度お試しください。');
        return;
      }

      const member = await guild.members.fetch(user.id).catch(() => null);
      if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
        res.status(403).send('このサーバーの管理者権限を持つアカウントでログインしてください。');
        return;
      }

      req.session.userId = user.id;
      req.session.username = user.username;
      res.redirect('/');
    } catch (error) {
      console.error('[web] OAuth2ログインに失敗しました', error);
      res.status(500).send('ログインに失敗しました。時間をおいて再度お試しください。');
    }
  });

  app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/login'));
  });

  app.get('/api/me', requireAuth, (req, res) => {
    res.json({ userId: req.session.userId, username: req.session.username });
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
    if (!req.session.userId) {
      res.redirect('/login');
      return;
    }
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  });

  app.listen(webConfig.port, webConfig.host, () => {
    console.log(`[web] 管理画面を起動しました: ${webConfig.baseUrl} (${webConfig.host}:${webConfig.port})`);
  });
}
