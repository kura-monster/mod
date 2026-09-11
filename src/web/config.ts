import crypto from 'node:crypto';
import { optional, optionalBool, optionalInt } from '../config.js';

const port = optionalInt('ADMIN_PANEL_PORT', 3000);
const sessionSecretFromEnv = optional('SESSION_SECRET');

export const webConfig = {
  enabled: optionalBool('ADMIN_PANEL_ENABLED', true),
  port,
  baseUrl: optional('ADMIN_PANEL_BASE_URL') ?? `http://localhost:${port}`,
  clientSecret: optional('DISCORD_CLIENT_SECRET'),
  sessionSecret: sessionSecretFromEnv ?? crypto.randomBytes(32).toString('hex'),
  sessionSecretIsGenerated: !sessionSecretFromEnv,
};
