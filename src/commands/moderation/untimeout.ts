import { type ChatInputCommandInteraction, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { logModerationAction } from '../../services/moderationLog.js';
import type { Command } from '../types.js';

export const untimeout: Command = {
  data: new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('メンバーのタイムアウトを解除します')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false)
    .addUserOption((o) => o.setName('user').setDescription('対象ユーザー').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('理由').setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') ?? undefined;
    const member = await interaction.guild!.members.fetch(target.id);

    await member.timeout(null, reason);

    await logModerationAction({
      guild: interaction.guild!,
      action: 'UNTIMEOUT',
      moderator: interaction.user,
      target,
      reason,
    });

    await interaction.reply({ content: `${target} のタイムアウトを解除しました。`, flags: MessageFlags.Ephemeral });
  },
};
