import { type ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { logModerationAction } from '../../services/moderationLog.js';
import type { Command } from '../types.js';

export const softban: Command = {
  data: new SlashCommandBuilder()
    .setName('softban')
    .setDescription('メンバーをソフトBANします(直近メッセージを削除した上で再入室可能な状態にする)')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setDMPermission(false)
    .addUserOption((o) => o.setName('user').setDescription('対象ユーザー').setRequired(true))
    .addIntegerOption((o) =>
      o
        .setName('delete-days')
        .setDescription('遡って削除するメッセージの日数(0〜7、既定1)')
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false),
    )
    .addStringOption((o) => o.setName('reason').setDescription('理由').setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser('user', true);
    const deleteDays = interaction.options.getInteger('delete-days') ?? 1;
    const reason = interaction.options.getString('reason') ?? undefined;

    await interaction.guild!.members.ban(target, {
      reason: reason ? `[softban] ${reason}` : '[softban]',
      deleteMessageSeconds: deleteDays * 24 * 60 * 60,
    });
    await interaction.guild!.bans.remove(target.id, 'softban解除');

    await logModerationAction({
      guild: interaction.guild!,
      action: 'SOFTBAN',
      moderator: interaction.user,
      target,
      reason,
    });

    await interaction.reply({ content: `${target} をソフトBANしました。`, ephemeral: true });
  },
};
