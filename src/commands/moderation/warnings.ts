import {
  type ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { getWarnings } from '../../data/db.js';
import type { Command } from '../types.js';

export const warnings: Command = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('メンバーの警告履歴(永続保存)を表示します')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false)
    .addUserOption((o) => o.setName('user').setDescription('対象ユーザー').setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser('user', true);
    const history = await getWarnings(interaction.guild!.id, target.id);

    if (history.length === 0) {
      await interaction.reply({ content: `${target} に警告履歴はありません。`, flags: MessageFlags.Ephemeral });
      return;
    }

    const lines = history
      .slice(-10)
      .reverse()
      .map((w) => `**#${w.id}** <t:${Math.floor(w.timestamp / 1000)}:R> 実行者: <@${w.moderatorId}>\n理由: ${w.reason}`);

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle(`${target.tag} の警告履歴(累計 ${history.length} 回)`)
      .setDescription(lines.join('\n\n'))
      .setFooter({ text: history.length > 10 ? '直近10件を表示しています' : '全件表示しています' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
