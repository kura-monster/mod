import crypto from 'node:crypto';

interface LoginCode {
  userId: string;
  username: string;
  expiresAt: number;
}

const CODE_TTL_MS = 5 * 60 * 1000;
const codes = new Map<string, LoginCode>();

/**
 * 管理画面ログイン用のワンタイムコードを発行する(Discordの/admin-loginコマンドから呼ぶ)。
 * 5分間だけ有効・1回使うと消える使い捨てコード。
 */
export function createLoginCode(userId: string, username: string): string {
  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
  codes.set(code, { userId, username, expiresAt: Date.now() + CODE_TTL_MS });
  return code;
}

/** コードを検証し、成功したら消費(以後再利用不可)する */
export function consumeLoginCode(code: string): LoginCode | null {
  const entry = codes.get(code);
  if (!entry) return null;
  codes.delete(code);
  if (entry.expiresAt < Date.now()) return null;
  return entry;
}

setInterval(
  () => {
    const now = Date.now();
    for (const [code, entry] of codes) {
      if (entry.expiresAt < now) codes.delete(code);
    }
  },
  60 * 1000,
).unref();
