import {
  type ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type TextChannel,
} from 'discord.js';
import { logModerationAction } from '../../services/moderationLog.js';
import type { Command } from '../types.js';

export const purge: Command = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('直近のメッセージを一括削除します')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false)
    .addIntegerOption((o) =>
      o.setName('amount').setDescription('削除件数(1〜100)').setRequired(true).setMinValue(1).setMaxValue(100),
    )
    .addStringOption((o) => o.setName('reason').setDescription('理由').setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction) {
    const amount = interaction.options.getInteger('amount', true);
    const reason = interaction.options.getString('reason') ?? undefined;
    const channel = interaction.channel as TextChannel;

    const deleted = await channel.bulkDelete(amount, true);

    await logModerationAction({
      guild: interaction.guild!,
      action: 'PURGE',
      moderator: interaction.user,
      target: `#${channel.name}`,
      reason,
      extra: { 削除件数: `${deleted.size}件` },
    });

    await interaction.reply({ content: `${deleted.size} 件のメッセージを削除しました。`, flags: MessageFlags.Ephemeral });
  },
};
