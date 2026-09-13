import { type ChatInputCommandInteraction, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { automodConfig } from '../../automod/config.js';
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

    await maybeEscalate(interaction, target, total);
  },
};

/**
 * 警告の累計回数が AUTOMOD_WARN_ESCALATION_THRESHOLD の倍数に達するたびに、
 * 自動でタイムアウト/キックする(0=無効)。繰り返し違反する常習者への対応を自動化する。
 */
async function maybeEscalate(
  interaction: ChatInputCommandInteraction,
  target: { id: string; tag: string },
  total: number,
): Promise<void> {
  const { threshold, action, timeoutMinutes } = automodConfig.warnEscalation;
  if (threshold <= 0 || total % threshold !== 0) return;

  const member = await interaction.guild!.members.fetch(target.id).catch(() => null);
  if (!member) return;

  const reason = `警告が累計${total}回に達したため自動処罰(${threshold}回ごとにエスカレーション)`;

  if (action === 'kick') {
    await member.kick(reason).catch((error) => console.error('[warn] エスカレーションのキックに失敗しました', error));
    await logModerationAction({
      guild: interaction.guild!,
      action: 'WARN_ESCALATION_KICK',
      moderator: interaction.client.user!,
      target: member.user,
      reason,
    });
  } else {
    await member
      .timeout(timeoutMinutes * 60 * 1000, reason)
      .catch((error) => console.error('[warn] エスカレーションのタイムアウトに失敗しました', error));
    await logModerationAction({
      guild: interaction.guild!,
      action: 'WARN_ESCALATION_TIMEOUT',
      moderator: interaction.client.user!,
      target: member.user,
      reason,
      extra: { タイムアウト時間: `${timeoutMinutes}分` },
    });
  }
}
