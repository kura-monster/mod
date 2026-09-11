import {
  ChannelType,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type TextChannel,
} from 'discord.js';
import { logModerationAction } from '../../services/moderationLog.js';
import type { Command } from '../types.js';

export const unlock: Command = {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('チャンネルのロックを解除します')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .setDMPermission(false)
    .addChannelOption((o) =>
      o
        .setName('channel')
        .setDescription('対象チャンネル(未指定で実行チャンネル)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false),
    )
    .addStringOption((o) => o.setName('reason').setDescription('理由').setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction) {
    const reason = interaction.options.getString('reason') ?? undefined;
    const channel = (interaction.options.getChannel('channel') ?? interaction.channel) as TextChannel;

    await channel.permissionOverwrites.edit(interaction.guild!.roles.everyone, { SendMessages: null }, { reason });

    await logModerationAction({
      guild: interaction.guild!,
      action: 'UNLOCK',
      moderator: interaction.user,
      target: `#${channel.name}`,
      reason,
    });

    await interaction.reply({ content: `${channel} のロックを解除しました。`, ephemeral: true });
  },
};
