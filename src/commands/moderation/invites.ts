import { type ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../types.js';

export const invites: Command = {
  data: new SlashCommandBuilder()
    .setName('invites')
    .setDescription('サーバーの有効な招待リンク一覧を表示します(招待リンク作成スパム対策の確認用)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),

  async execute(interaction: ChatInputCommandInteraction) {
    const guildInvites = await interaction.guild!.invites.fetch().catch(() => null);

    if (!guildInvites || guildInvites.size === 0) {
      await interaction.reply({ content: '現在、有効な招待リンクはありません。', ephemeral: true });
      return;
    }

    const sorted = [...guildInvites.values()].sort((a, b) => (b.uses ?? 0) - (a.uses ?? 0)).slice(0, 15);
    const lines = sorted.map(
      (inv) =>
        `\`${inv.code}\` — 作成者: ${inv.inviter ? `<@${inv.inviter.id}>` : '不明'} / 使用回数: ${inv.uses ?? 0} / チャンネル: ${
          inv.channel ? `<#${inv.channel.id}>` : '不明'
        }`,
    );

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle(`📨 有効な招待リンク(${guildInvites.size}件)`)
      .setDescription(lines.join('\n'))
      .setFooter({ text: guildInvites.size > 15 ? '使用回数の多い上位15件を表示しています' : '全件表示しています' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
