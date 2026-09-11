import type { Invite } from 'discord.js';
import { logModerationAction } from '../services/moderationLog.js';
import { timeoutMemberSafe } from './actions.js';
import { automodConfig } from './config.js';
import { isExemptMember } from './exempt.js';
import { pushAndGetInviteCreationHistory } from './state.js';

/**
 * 招待リンクの「作成」自体のスパムを検知する。
 * レイド勢が参加口を大量に確保する/招待リンクスパムを撒くために
 * 短時間に何個も招待を発行するケースへの対策。
 */
export async function runInviteAutomod(invite: Invite): Promise<void> {
  if (!automodConfig.enabled) return;

  const guild = invite.guild;
  const inviter = invite.inviter;
  if (!guild || !('members' in guild) || !inviter || inviter.bot) return;

  const member = await guild.members.fetch(inviter.id).catch(() => null);
  if (!member) return;
  if (isExemptMember(member)) return;

  const now = Date.now();
  const history = pushAndGetInviteCreationHistory(inviter.id, now);
  const recent = history.filter((t) => now - t <= automodConfig.inviteCreate.windowMs);

  if (recent.length < automodConfig.inviteCreate.limit) return;

  const reason = `${automodConfig.inviteCreate.windowMs / 1000}秒以内に${recent.length}件の招待リンクを作成しました`;

  if (!automodConfig.logOnly) {
    await invite.delete('招待リンク作成スパムの疑いのため自動削除').catch((error) => {
      console.error('[automod] 招待リンクの削除に失敗しました', error);
    });
    await timeoutMemberSafe(member, 10 * 60 * 1000, reason);
  }

  await logModerationAction({
    guild,
    action: 'AUTO_INVITE_CREATE_FLOOD',
    moderator: guild.client.user!,
    target: inviter,
    reason,
    extra: automodConfig.logOnly ? { モード: 'ログのみ(自動対応は無効)' } : { 対応: '招待削除+10分タイムアウト' },
  });
}
