import { PermissionFlagsBits, type GuildMember } from 'discord.js';
import { automodConfig } from './config.js';

/**
 * 通常の自動検知(スパム/NGワード等)における除外判定。
 * ManageGuild権限保持者、または AUTOMOD_EXEMPT_ROLE_IDS のロールを持つメンバーは対象外。
 * ※ アンチNuke([auditAutomod.ts](./auditAutomod.ts))はこれとは別の判定を使うので注意。
 */
export function isExemptMember(member: GuildMember): boolean {
  if (member.permissions.has(PermissionFlagsBits.ManageGuild)) return true;
  return automodConfig.exemptRoleIds.some((roleId) => member.roles.cache.has(roleId));
}
