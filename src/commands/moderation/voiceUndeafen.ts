import { type ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { logModerationAction } from '../../services/moderationLog.js';
import type { Command } from '../types.js';

export const voiceUndeafen: Command = {
  data: new SlashCommandBuilder()
    .setName('voice-undeafen')
    .setDescription('メンバーのサーバースピーカーミュートを解除します')
    .setDefaultMemberPermissions(PermissionFlagsBits.DeafenMembers)
    .setDMPermission(false)
    .addUserOption((o) => o.setName('user').setDescription('対象ユーザー').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('理由').setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') ?? undefined;
    const member = await interaction.guild!.members.fetch(target.id);

    await member.voice.setDeaf(false, reason);

    await logModerationAction({
      guild: interaction.guild!,
      action: 'VOICE_UNDEAFEN',
      moderator: interaction.user,
      target,
      reason,
    });

    await interaction.reply({ content: `${target} のサーバースピーカーミュートを解除しました。`, ephemeral: true });
  },
};
