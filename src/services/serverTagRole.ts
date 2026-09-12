import type { Client, GuildMember, User } from 'discord.js';
import { config } from '../config.js';

function hasTargetServerTag(user: User): boolean {
  const primaryGuild = user.primaryGuild;
  if (!primaryGuild || !primaryGuild.identityEnabled) return false;
  return primaryGuild.identityGuildId === config.serverTag.guildId;
}

/**
 * 指定サーバーの鯖タグ(Server Tag/Primary Guild)を着用しているかどうかに応じて、
 * ロールを自動で付与/剥奪する。SERVER_TAG_ROLE_ID が未設定の場合は何もしない。
 */
export async function syncServerTagRole(member: GuildMember): Promise<void> {
  const { guildId, roleId } = config.serverTag;
  if (!roleId || !guildId) return;
  if (member.guild.id !== guildId) return;
  if (member.user.bot) return;

  const shouldHaveRole = hasTargetServerTag(member.user);
  const hasRole = member.roles.cache.has(roleId);

  if (shouldHaveRole && !hasRole) {
    await member.roles
      .add(roleId, '鯖タグの着用を検知したため自動付与')
      .catch((error) => console.error('[serverTag] ロール付与に失敗しました', error));
  } else if (!shouldHaveRole && hasRole) {
    await member.roles
      .remove(roleId, '鯖タグの非着用を検知したため自動剥奪')
      .catch((error) => console.error('[serverTag] ロール剥奪に失敗しました', error));
  }
}

/**
 * ボット起動時(再接続時含む)に対象サーバーの全メンバーを走査し、
 * オフライン中に鯖タグが変わった/ロールが手動で変更された等のズレを是正する。
 */
export async function reconcileServerTagRoles(client: Client): Promise<void> {
  const { guildId, roleId } = config.serverTag;
  if (!roleId || !guildId) return;

  const guild = client.guilds.cache.get(guildId);
  if (!guild) {
    console.warn(`[serverTag] サーバー ${guildId} が見つからないため、鯖タグロールの同期をスキップしました`);
    return;
  }

  const members = await guild.members.fetch().catch((error) => {
    console.error('[serverTag] メンバー一覧の取得に失敗しました', error);
    return null;
  });
  if (!members) return;

  console.log(`[serverTag] ${members.size}人のメンバーで鯖タグロールの同期を開始します`);
  for (const member of members.values()) {
    await syncServerTagRole(member);
  }
  console.log('[serverTag] 鯖タグロールの同期が完了しました');
}
