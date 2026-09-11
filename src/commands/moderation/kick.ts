import { type ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { logModerationAction } from '../../services/moderationLog.js';
import type { Command } from '../types.js';

export const kick: Command = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('メンバーをキックします')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .setDMPermission(false)
    .addUserOption((o) => o.setName('user').setDescription('対象ユーザー').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('理由').setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') ?? undefined;
    const member = await interaction.guild!.members.fetch(target.id);

    await member.kick(reason);

    await logModerationAction({
      guild: interaction.guild!,
      action: 'KICK',
      moderator: interaction.user,
      target,
      reason,
    });

    await interaction.reply({ content: `${target} をキックしました。`, ephemeral: true });
  },
};
