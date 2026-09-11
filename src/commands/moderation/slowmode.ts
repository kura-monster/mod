import {
  ChannelType,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type TextChannel,
} from 'discord.js';
import { logModerationAction } from '../../services/moderationLog.js';
import type { Command } from '../types.js';

export const slowmode: Command = {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('チャンネルのスローモードを設定します')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .setDMPermission(false)
    .addIntegerOption((o) =>
      o.setName('seconds').setDescription('秒数(0で解除、最大21600)').setRequired(true).setMinValue(0).setMaxValue(21600),
    )
    .addChannelOption((o) =>
      o
        .setName('channel')
        .setDescription('対象チャンネル(未指定で実行チャンネル)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false),
    )
    .addStringOption((o) => o.setName('reason').setDescription('理由').setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction) {
    const seconds = interaction.options.getInteger('seconds', true);
    const reason = interaction.options.getString('reason') ?? undefined;
    const channel = (interaction.options.getChannel('channel') ?? interaction.channel) as TextChannel;

    await channel.setRateLimitPerUser(seconds, reason);

    await logModerationAction({
      guild: interaction.guild!,
      action: 'SLOWMODE',
      moderator: interaction.user,
      target: `#${channel.name}`,
      reason,
      extra: { 秒数: `${seconds}秒` },
    });

    await interaction.reply({ content: `${channel} のスローモードを ${seconds} 秒に設定しました。`, ephemeral: true });
  },
};
