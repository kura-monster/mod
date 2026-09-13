import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cookieSession from 'cookie-session';
import { PermissionFlagsBits, type Client } from 'discord.js';
import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import { config } from '../config.js';
import { getCasesSince, getOrCreatePersistedSessionSecret, getRecentCases } from '../data/db.js';
import { getEffectiveSettings, updateSettingByKey } from './configBridge.js';
import { webConfig } from './config.js';
import { SETTINGS_SCHEMA } from './settingsSchema.js';

// @types/cookie-session は CookieSessionObject をグローバル名前空間に宣言しているため、
// 'declare module' ではなく 'declare global' 側でマージする必要がある
declare global {
  namespace CookieSessionInterfaces {
    interface CookieSessionObject {
      userId?: string;
      username?: string;
      // OAuth2のログインCSRF対策用。/loginで発行し/callbackで一致を確認したら消す
      oauthState?: string;
    }
  }
}

const DISCORD_API = 'https://discord.com/api/v10';
const PUBLIC_DIR = fileURLToPath(new URL('./public', import.meta.url));

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.session?.userId) {
    next();
    return;
  }
  res.status(401).json({ error: '認証が必要です' });
}

export async function startWebPanel(client: Client): Promise<void> {
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

  // SESSION_SECRETが未設定でも、再起動のたびにログインが無効化され続けないよう
  // DBに永久保存した値を使い回す(「認証しても認証しても弾かれる」問題の主因だった)
  const sessionSecret = webConfig.sessionSecretFromEnv ?? (await getOrCreatePersistedSessionSecret());
  if (!webConfig.sessionSecretFromEnv) {
    console.log('[web] SESSION_SECRET未設定のため、data/db.jsonに保存した鍵を使用します(再起動しても維持されます)');
  }

  const app = express();
  // リバースプロキシ(MrtCloud等)配下でクッキーのSecure属性やIP判定を正しく扱うために必要
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(express.json());
  // サーバー側にセッションを持たない、署名付きCookieのみの方式(cookie-session)を採用。
  // express-sessionの既定(MemoryStore)だとプロセス再起動でログイン状態が全て消え、
  // 「認証しても認証しても弾かれる」原因になっていたため、再起動の影響を受けない構成にした。
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

  // ブラウザ(またはCDN)が/loginの302応答をキャッシュしてしまうと、次回訪問時に
  // 新しいstateを発行する処理自体が実行されず、古いCookie/stateが再生され続けて
  // 認証が永久に失敗する原因になっていた。管理画面は小さく低トラフィックなので、
  // 静的ファイルも含めて全レスポンスにキャッシュ禁止を適用してしまって問題ない
  app.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    next();
  });

  app.get('/login', (req, res) => {
    // OAuth2のログインCSRF(state固定)対策。/callbackで値が一致することを確認する
    const state = crypto.randomBytes(16).toString('hex');
    if (req.session) req.session.oauthState = state;

    console.log('[web] /login でstateを発行しました', {
      statePrefix: state.slice(0, 8),
      sessionIsNewBeforeAssign: req.session?.isNew,
      sessionPopulatedAfterAssign: req.session?.isPopulated,
    });

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: `${webConfig.baseUrl}/callback`,
      response_type: 'code',
      scope: 'identify',
      state,
    });
    res.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
  });

  app.get('/callback', async (req, res) => {
    const { code, state } = req.query;

    if (typeof state !== 'string' || !req.session?.oauthState || state !== req.session.oauthState) {
      // cookie-sessionは署名検証に失敗しても「空の新規セッション」を作って返すため、
      // req.session != null だけでは「Cookieが正しく検証できたか」を判別できない。
      // isNew/isPopulatedと生のCookie名の有無まで見て切り分ける(値自体は出さない)
      const cookieNames = (req.headers.cookie ?? '')
        .split(';')
        .map((c) => c.split('=')[0]?.trim())
        .filter(Boolean);
      console.warn('[web] state検証に失敗しました', {
        queryStatePrefix: typeof state === 'string' ? state.slice(0, 8) : null,
        cookieNamesPresent: cookieNames,
        hasSessionCookie: cookieNames.includes('session'),
        hasSessionSigCookie: cookieNames.includes('session.sig'),
        sessionIsNew: req.session?.isNew,
        sessionIsPopulated: req.session?.isPopulated,
        hasStoredState: Boolean(req.session?.oauthState),
        queryStateReceived: typeof state === 'string',
      });
      res
        .status(400)
        .send('認証セッションが無効です(有効期限切れ、または不正なリクエストの可能性)。もう一度 /login からやり直してください。');
      return;
    }
    req.session.oauthState = undefined;

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

      // cookie-sessionはCookieの中身がそのままセッションなので、内容を丸ごと入れ替えることで
      // ログイン前のCookie値を無効化する(express-sessionのregenerate相当)
      req.session = { userId: user.id, username: user.username };
      res.redirect('/');
    } catch (error) {
      console.error('[web] OAuth2ログインに失敗しました', error);
      res.status(500).send('ログインに失敗しました。時間をおいて再度お試しください。');
    }
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
