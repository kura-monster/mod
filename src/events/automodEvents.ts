import { AuditLogEvent, type Client } from 'discord.js';
import { runAntiNuke } from '../automod/auditAutomod.js';
import { runInviteAutomod } from '../automod/inviteAutomod.js';
import { runMemberAutomod } from '../automod/memberAutomod.js';
import { runNicknameAutomod } from '../automod/memberUpdateAutomod.js';
import { runMessageAutomod } from '../automod/messageAutomod.js';

export function registerAutomodEvents(client: Client): void {
  client.on('messageCreate', (message) => {
    runMessageAutomod(message).catch((error) => console.error('[automod] メッセージ検査中にエラーが発生しました', error));
  });

  client.on('guildMemberAdd', (member) => {
    runMemberAutomod(member).catch((error) => console.error('[automod] メンバー参加検査中にエラーが発生しました', error));
  });

  client.on('guildMemberUpdate', (oldMember, newMember) => {
    runNicknameAutomod(oldMember, newMember).catch((error) =>
      console.error('[automod] ニックネーム変更検査中にエラーが発生しました', error),
    );
  });

  client.on('inviteCreate', (invite) => {
    runInviteAutomod(invite).catch((error) => console.error('[automod] 招待リンク作成検査中にエラーが発生しました', error));
  });

  client.on('channelDelete', (channel) => {
    if (!('guild' in channel) || !channel.guild) return;
    runAntiNuke(channel.guild, AuditLogEvent.ChannelDelete, channel.id).catch((error) =>
      console.error('[automod] アンチNuke検査(チャンネル削除)中にエラーが発生しました', error),
    );
  });

  client.on('roleDelete', (role) => {
    runAntiNuke(role.guild, AuditLogEvent.RoleDelete, role.id).catch((error) =>
      console.error('[automod] アンチNuke検査(ロール削除)中にエラーが発生しました', error),
    );
  });
}
