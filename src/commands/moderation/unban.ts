import { type ChatInputCommandInteraction, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { logModerationAction } from '../../services/moderationLog.js';
import type { Command } from '../types.js';

export const unban: Command = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('ユーザーIDを指定してBANを解除します')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setDMPermission(false)
    .addStringOption((o) => o.setName('user-id').setDescription('対象ユーザーID').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('理由').setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction) {
    const userId = interaction.options.getString('user-id', true);
    const reason = interaction.options.getString('reason') ?? undefined;

    const bannedUser = await interaction.client.users.fetch(userId);
    await interaction.guild!.bans.remove(userId, reason);

    await logModerationAction({
      guild: interaction.guild!,
      action: 'UNBAN',
      moderator: interaction.user,
      target: bannedUser,
      reason,
    });

    await interaction.reply({ content: `${bannedUser.tag} のBANを解除しました。`, flags: MessageFlags.Ephemeral });
  },
};
