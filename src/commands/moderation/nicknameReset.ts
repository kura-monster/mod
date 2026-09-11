import { type ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { logModerationAction } from '../../services/moderationLog.js';
import type { Command } from '../types.js';

export const nicknameReset: Command = {
  data: new SlashCommandBuilder()
    .setName('nickname-reset')
    .setDescription('メンバーのニックネームをリセットします')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
    .setDMPermission(false)
    .addUserOption((o) => o.setName('user').setDescription('対象ユーザー').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('理由').setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') ?? undefined;
    const member = await interaction.guild!.members.fetch(target.id);

    await member.setNickname(null, reason);

    await logModerationAction({
      guild: interaction.guild!,
      action: 'NICKNAME_RESET',
      moderator: interaction.user,
      target,
      reason,
    });

    await interaction.reply({ content: `${target} のニックネームをリセットしました。`, ephemeral: true });
  },
};
