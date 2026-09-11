import { type ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { logModerationAction } from '../../services/moderationLog.js';
import type { Command } from '../types.js';

export const timeout: Command = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('メンバーをタイムアウトします')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false)
    .addUserOption((o) => o.setName('user').setDescription('対象ユーザー').setRequired(true))
    .addIntegerOption((o) =>
      o.setName('minutes').setDescription('タイムアウト時間(分)').setRequired(true).setMinValue(1).setMaxValue(40320),
    )
    .addStringOption((o) => o.setName('reason').setDescription('理由').setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser('user', true);
    const minutes = interaction.options.getInteger('minutes', true);
    const reason = interaction.options.getString('reason') ?? undefined;
    const member = await interaction.guild!.members.fetch(target.id);

    await member.timeout(minutes * 60 * 1000, reason);

    await logModerationAction({
      guild: interaction.guild!,
      action: 'TIMEOUT',
      moderator: interaction.user,
      target,
      reason,
      extra: { 時間: `${minutes}分` },
    });

    await interaction.reply({ content: `${target} を ${minutes} 分間タイムアウトしました。`, ephemeral: true });
  },
};
