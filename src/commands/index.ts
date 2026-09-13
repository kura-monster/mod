import { Collection } from 'discord.js';
import type { Command } from './types.js';

import { warn } from './moderation/warn.js';
import { nicknameReset } from './moderation/nicknameReset.js';
import { voiceMute } from './moderation/voiceMute.js';
import { voiceUnmute } from './moderation/voiceUnmute.js';
import { slowmode } from './moderation/slowmode.js';
import { timeout } from './moderation/timeout.js';
import { untimeout } from './moderation/untimeout.js';
import { kick } from './moderation/kick.js';
import { voiceDeafen } from './moderation/voiceDeafen.js';
import { voiceUndeafen } from './moderation/voiceUndeafen.js';
import { lock } from './moderation/lock.js';
import { unlock } from './moderation/unlock.js';
import { purge } from './moderation/purge.js';
import { ban } from './moderation/ban.js';
import { unban } from './moderation/unban.js';
import { softban } from './moderation/softban.js';
import { raidLockdown } from './moderation/raidLockdown.js';
import { warnings } from './moderation/warnings.js';
import { caseLookup } from './moderation/caseLookup.js';
import { automodStatus } from './moderation/automodStatus.js';
import { invites } from './moderation/invites.js';
import { userinfo } from './moderation/userinfo.js';
import { modstats } from './moderation/modstats.js';
import { adminLogin } from './moderation/adminLogin.js';
import { report } from './moderation/report.js';
import { reports } from './moderation/reports.js';

const list: Command[] = [
  // 軽度
  warn,
  nicknameReset,
  voiceMute,
  voiceUnmute,
  slowmode,
  // 中度
  timeout,
  untimeout,
  kick,
  voiceDeafen,
  voiceUndeafen,
  lock,
  unlock,
  purge,
  // 重度
  ban,
  unban,
  softban,
  raidLockdown,
  // 記録の照会(永続DB)・設定確認(いずれも環境変数の値を変更しない読み取り専用コマンド)
  warnings,
  caseLookup,
  automodStatus,
  invites,
  userinfo,
  modstats,
  adminLogin,
  reports,
  // 全メンバーが使える通報コマンド(権限制限なし)
  report,
];

export const commands = new Collection<string, Command>(list.map((command) => [command.data.name, command]));
