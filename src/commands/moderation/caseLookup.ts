import { type ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { getCase } from '../../data/db.js';
import { ACTIONS, type ActionKey, SEVERITY_COLOR, SEVERITY_LABEL, type Severity } from '../../types/moderation.js';
import type { Command } from '../types.js';

export const caseLookup: Command = {
  data: new SlashCommandBuilder()
    .setName('case')
    .setDescription('モデレーションケース(永続保存された記録)の詳細を表示します')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false)
    .addIntegerOption((o) => o.setName('id').setDescription('ケース番号').setRequired(true).setMinValue(1)),

  async execute(interaction: ChatInputCommandInteraction) {
    const id = interaction.options.getInteger('id', true);
    const record = await getCase(id);

    if (!record || record.guildId !== interaction.guild!.id) {
      await interaction.reply({ content: `ケース #${id} は見つかりませんでした。`, ephemeral: true });
      return;
    }

    const meta = ACTIONS[record.action as ActionKey] as { label: string; emoji: string } | undefined;
    const severity = record.severity as Severity;

    const embed = new EmbedBuilder()
      .setColor(SEVERITY_COLOR[severity] ?? 0x95a5a6)
      .setTitle(`${meta?.emoji ?? '📄'} ケース #${record.id} — ${meta?.label ?? record.action}`)
      .addFields(
        { name: '対象', value: record.targetLabel, inline: true },
        { name: '実行者', value: `<@${record.moderatorId}> (${record.moderatorTag})`, inline: true },
        { name: '重大度', value: SEVERITY_LABEL[severity] ?? severity, inline: true },
        { name: '理由', value: record.reason },
        { name: '日時', value: `<t:${Math.floor(record.timestamp / 1000)}:F>` },
      );

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
