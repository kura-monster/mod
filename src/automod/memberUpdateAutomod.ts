import type { GuildMember, PartialGuildMember } from 'discord.js';
import { logModerationAction } from '../services/moderationLog.js';
import { automodConfig } from './config.js';
import { isExemptMember } from './exempt.js';
import { pushAndGetNicknameChangeHistory } from './state.js';

/**
 * 短時間にニックネームを何度も変更する荒らし行為を検知する(ログのみ、罰は与えない)。
 * フィルター回避や単純な迷惑行為として使われることが多いため、モデレーターへの
 * 可視化を目的とする。
 */
export async function runNicknameAutomod(
  oldMember: GuildMember | PartialGuildMember,
  newMember: GuildMember,
): Promise<void> {
  if (!automodConfig.enabled) return;
  if (oldMember.nickname === newMember.nickname) return;
  if (isExemptMember(newMember)) return;

  const now = Date.now();
  const history = pushAndGetNicknameChangeHistory(newMember.id, now);
  const recent = history.filter((t) => now - t <= automodConfig.nicknameSpam.windowMs);

  if (recent.length < automodConfig.nicknameSpam.limit) return;

  await logModerationAction({
    guild: newMember.guild,
    action: 'AUTO_NICKNAME_SPAM',
    moderator: newMember.client.user!,
    target: newMember.user,
    reason: `${automodConfig.nicknameSpam.windowMs / 1000}秒以内に${recent.length}回ニックネームを変更しました`,
  });
}
