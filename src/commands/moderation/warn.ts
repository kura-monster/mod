import { type ChatInputCommandInteraction, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { addWarning } from '../../data/db.js';
import { logModerationAction } from '../../services/moderationLog.js';
import type { Command } from '../types.js';

export const warn: Command = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('メンバーに警告を送ります')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false)
    .addUserOption((o) => o.setName('user').setDescription('対象ユーザー').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('理由').setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') ?? undefined;

    const { total } = await addWarning(interaction.guild!.id, target.id, {
      moderatorId: interaction.user.id,
      reason: reason ?? '理由未記載',
      timestamp: Date.now(),
    });

    await logModerationAction({
      guild: interaction.guild!,
      action: 'WARN',
      moderator: interaction.user,
      target,
      reason,
      extra: { 累計警告回数: `${total}回` },
    });

    await interaction.reply({
      content: `${target} に警告を送りました。(累計 ${total} 回目)`,
      flags: MessageFlags.Ephemeral,
    });
    await target
      .send(`${interaction.guild!.name} で警告を受けました。(累計 ${total} 回目)\n理由: ${reason ?? '理由未記載'}`)
      .catch(() => {});
  },
};
