import { type ChatInputCommandInteraction, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { logModerationAction } from '../../services/moderationLog.js';
import type { Command } from '../types.js';

export const ban: Command = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('メンバーをBANします')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setDMPermission(false)
    .addUserOption((o) => o.setName('user').setDescription('対象ユーザー').setRequired(true))
    .addIntegerOption((o) =>
      o
        .setName('delete-days')
        .setDescription('遡って削除するメッセージの日数(0〜7)')
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false),
    )
    .addStringOption((o) => o.setName('reason').setDescription('理由').setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser('user', true);
    const deleteDays = interaction.options.getInteger('delete-days') ?? 0;
    const reason = interaction.options.getString('reason') ?? undefined;

    await interaction.guild!.members.ban(target, {
      reason,
      deleteMessageSeconds: deleteDays * 24 * 60 * 60,
    });

    await logModerationAction({
      guild: interaction.guild!,
      action: 'BAN',
      moderator: interaction.user,
      target,
      reason,
    });

    await interaction.reply({ content: `${target} をBANしました。`, flags: MessageFlags.Ephemeral });
  },
};
