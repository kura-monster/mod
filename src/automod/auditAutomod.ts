import { AuditLogEvent, type Guild, type GuildMember } from 'discord.js';
import { logModerationAction } from '../services/moderationLog.js';
import { banMemberSafe } from './actions.js';
import { automodConfig } from './config.js';
import { pushAndGetNukeActionHistory } from './state.js';

/**
 * アンチNukeにおける除外判定。
 * 通常の自動検知([exempt.ts](./exempt.ts))とは異なり、ManageGuild権限保持者を
 * 自動的には除外しない。乗っ取られた管理者アカウントや信頼していたはずのメンバーに
 * よるチャンネル/ロールの大量削除(サーバー破壊行為)を検知することが目的であり、
 * 削除権限を持つ人物(=まさに検知したい相手)を素通りさせては意味がないため。
 * サーバーオーナー、および AUTOMOD_EXEMPT_ROLE_IDS のロール保持者のみ除外する。
 */
function isExemptFromAntiNuke(member: GuildMember): boolean {
  if (member.id === member.guild.ownerId) return true;
  return automodConfig.exemptRoleIds.some((roleId) => member.roles.cache.has(roleId));
}

async function findRecentExecutor(guild: Guild, type: AuditLogEvent, targetId: string) {
  const logs = await guild.fetchAuditLogs({ type, limit: 5 }).catch(() => null);
  if (!logs) return null;

  const entry = logs.entries.find((e) => e.targetId === targetId);
  if (!entry || !entry.executor) return null;
  // 監査ログの反映には多少のラグがあるため、直近の操作でなければ無関係とみなす
  if (Date.now() - entry.createdTimestamp > 10_000) return null;

  return entry.executor;
}

/**
 * チャンネル/ロールの削除イベントを受けて、監査ログから実行者を特定し、
 * 短時間に何度も削除している場合はサーバー破壊行為とみなして自動BANする。
 * (作成イベントは正当な初期設定作業でも頻発するため対象外。危険度の高い「削除」のみを見る)
 */
export async function runAntiNuke(guild: Guild, type: AuditLogEvent, targetId: string): Promise<void> {
  if (!automodConfig.antiNuke.enabled) return;

  const executor = await findRecentExecutor(guild, type, targetId);
  if (!executor || executor.bot) return;

  const member = await guild.members.fetch(executor.id).catch(() => null);
  if (!member) return;
  if (isExemptFromAntiNuke(member)) return;

  const now = Date.now();
  const key = `${guild.id}:${executor.id}`;
  const history = pushAndGetNukeActionHistory(key, now);
  const recent = history.filter((t) => now - t <= automodConfig.antiNuke.windowMs);

  if (recent.length < automodConfig.antiNuke.limit) return;

  const reason = `${automodConfig.antiNuke.windowMs / 1000}秒以内にチャンネル/ロールの削除を${recent.length}回検知しました(サーバー破壊行為の疑い)`;

  if (!automodConfig.logOnly) {
    await banMemberSafe(member, reason);
  }

  await logModerationAction({
    guild,
    action: 'AUTO_NUKE_ATTEMPT',
    moderator: guild.client.user!,
    target: member.user,
    reason,
    extra: automodConfig.logOnly ? { モード: 'ログのみ(自動対応は無効)' } : { 対応: '自動BANしました' },
  });
}
