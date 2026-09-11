import { EmbedBuilder, type GuildMember, type PartialGuildMember } from 'discord.js';
import { config } from '../config.js';

/**
 * 入室ログを送信する。JOIN_LOG_CHANNEL_ID が未設定の場合は送信しない。
 */
export async function logMemberJoin(member: GuildMember): Promise<void> {
  if (!config.joinLogChannelId) return;

  const channel = await member.guild.channels.fetch(config.joinLogChannelId).catch(() => null);
  if (!channel || !channel.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle('📥 入室')
    .setThumbnail(member.user.displayAvatarURL())
    .addFields(
      { name: 'ユーザー', value: `${member.user} (${member.user.tag})`, inline: true },
      {
        name: 'アカウント作成日',
        value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
        inline: true,
      },
      { name: '現在のメンバー数', value: `${member.guild.memberCount}`, inline: true },
    )
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}

/**
 * 退出ログを送信する。LEAVE_LOG_CHANNEL_ID が未設定の場合は送信しない。
 */
export async function logMemberLeave(member: GuildMember | PartialGuildMember): Promise<void> {
  if (!config.leaveLogChannelId) return;

  const channel = await member.guild.channels.fetch(config.leaveLogChannelId).catch(() => null);
  if (!channel || !channel.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setColor(0xe74c3c)
    .setTitle('📤 退出')
    .setThumbnail(member.user.displayAvatarURL())
    .addFields(
      { name: 'ユーザー', value: `${member.user} (${member.user.tag})`, inline: true },
      {
        name: '在籍期間',
        value: member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>から` : '不明',
        inline: true,
      },
      { name: '現在のメンバー数', value: `${member.guild.memberCount}`, inline: true },
    )
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}
