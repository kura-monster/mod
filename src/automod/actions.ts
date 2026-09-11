import type { GuildMember, Message } from 'discord.js';

export async function deleteMessageSafe(message: Message): Promise<void> {
  if (!message.deletable) return;
  await message.delete().catch((error) => console.error('[automod] メッセージ削除に失敗しました', error));
}

export async function timeoutMemberSafe(member: GuildMember, ms: number, reason: string): Promise<void> {
  await member.timeout(ms, reason).catch((error) => console.error('[automod] タイムアウトに失敗しました', error));
}

export async function kickMemberSafe(member: GuildMember, reason: string): Promise<void> {
  await member.kick(reason).catch((error) => console.error('[automod] キックに失敗しました', error));
}

export async function banMemberSafe(member: GuildMember, reason: string): Promise<void> {
  await member.guild.members.ban(member, { reason }).catch((error) => console.error('[automod] BANに失敗しました', error));
}
