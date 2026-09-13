import {
  type ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { getReportsForUser } from '../../data/db.js';
import type { Command } from '../types.js';

export const reports: Command = {
  data: new SlashCommandBuilder()
    .setName('reports')
    .setDescription('メンバーが受けた通報の履歴(永続保存)を表示します')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false)
    .addUserOption((o) => o.setName('user').setDescription('対象ユーザー').setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser('user', true);
    const history = await getReportsForUser(interaction.guild!.id, target.id);

    if (history.length === 0) {
      await interaction.reply({ content: `${target} への通報履歴はありません。`, flags: MessageFlags.Ephemeral });
      return;
    }

    const lines = history
      .slice(-10)
      .reverse()
      .map(
        (r) =>
          `**#${r.id}** <t:${Math.floor(r.timestamp / 1000)}:R> 通報者: <@${r.reporterId}>\n理由: ${r.reason}${
            r.messageLink ? `\nメッセージ: ${r.messageLink}` : ''
          }`,
      );

    const embed = new EmbedBuilder()
      .setColor(0xe67e22)
      .setTitle(`${target.tag} への通報履歴(累計 ${history.length} 件)`)
      .setDescription(lines.join('\n\n'))
      .setFooter({ text: history.length > 10 ? '直近10件を表示しています' : '全件表示しています' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
