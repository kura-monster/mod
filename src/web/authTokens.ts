import crypto from 'node:crypto';

interface TokenPayload {
  userId: string;
  username: string;
  exp: number;
}

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function sign(payloadBase64: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payloadBase64).digest('base64url');
}

/**
 * サーバー側に何も保持しない、自己完結・署名付きの認証トークンを発行する。
 * Cookieを一切使わないため、このホスティング環境でSet-Cookieが機能しない問題の影響を受けない。
 * ブラウザのlocalStorageに保存し、以後はAuthorizationヘッダーで送る想定。
 */
export function createAuthToken(userId: string, username: string, secret: string): string {
  const payload: TokenPayload = { userId, username, exp: Date.now() + TOKEN_TTL_MS };
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${payloadBase64}.${sign(payloadBase64, secret)}`;
}

export function verifyAuthToken(token: string, secret: string): TokenPayload | null {
  const separatorIndex = token.lastIndexOf('.');
  if (separatorIndex === -1) return null;

  const payloadBase64 = token.slice(0, separatorIndex);
  const signature = token.slice(separatorIndex + 1);
  const expected = sign(payloadBase64, secret);

  const signatureBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (signatureBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(signatureBuf, expectedBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf-8')) as TokenPayload;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
