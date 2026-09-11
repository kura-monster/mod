import { type ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { getCasesSince } from '../../data/db.js';
import type { Command } from '../types.js';

export const modstats: Command = {
  data: new SlashCommandBuilder()
    .setName('modstats')
    .setDescription('モデレーション対応件数の集計(永続DB)を表示します')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false)
    .addIntegerOption((o) =>
      o.setName('days').setDescription('集計対象の日数(既定7日)').setMinValue(1).setMaxValue(90).setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const days = interaction.options.getInteger('days') ?? 7;
    const cases = await getCasesSince(interaction.guild!.id, Date.now() - days * 24 * 60 * 60 * 1000);

    if (cases.length === 0) {
      await interaction.reply({ content: `直近${days}日間の対応記録はありません。`, ephemeral: true });
      return;
    }

    const bySeverity: Record<string, number> = {};
    const byModerator = new Map<string, number>();
    for (const c of cases) {
      bySeverity[c.severity] = (bySeverity[c.severity] ?? 0) + 1;
      byModerator.set(c.moderatorId, (byModerator.get(c.moderatorId) ?? 0) + 1);
    }

    const topModerators =
      [...byModerator.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id, count]) => `<@${id}>: ${count}件`)
        .join('\n') || 'なし';

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle(`📊 モデレーション統計(直近${days}日間)`)
      .addFields(
        { name: '総件数', value: `${cases.length}件`, inline: true },
        { name: '軽度', value: `${bySeverity.minor ?? 0}件`, inline: true },
        { name: '中度', value: `${bySeverity.moderate ?? 0}件`, inline: true },
        { name: '重度', value: `${bySeverity.severe ?? 0}件`, inline: true },
        { name: '対応件数の多い実行者(ボット自身=自動検知を含む)', value: topModerators },
      );

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
