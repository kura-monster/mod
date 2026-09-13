import { type ChatInputCommandInteraction, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { logModerationAction } from '../../services/moderationLog.js';
import type { Command } from '../types.js';

export const voiceMute: Command = {
  data: new SlashCommandBuilder()
    .setName('voice-mute')
    .setDescription('ボイスチャンネル内のメンバーをサーバーミュートします')
    .setDefaultMemberPermissions(PermissionFlagsBits.MuteMembers)
    .setDMPermission(false)
    .addUserOption((o) => o.setName('user').setDescription('対象ユーザー').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('理由').setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') ?? undefined;
    const member = await interaction.guild!.members.fetch(target.id);

    await member.voice.setMute(true, reason);

    await logModerationAction({
      guild: interaction.guild!,
      action: 'VOICE_MUTE',
      moderator: interaction.user,
      target,
      reason,
    });

    await interaction.reply({ content: `${target} をサーバーミュートしました。`, flags: MessageFlags.Ephemeral });
  },
};
