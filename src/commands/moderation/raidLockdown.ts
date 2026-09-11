import {
  type ChatInputCommandInteraction,
  GuildVerificationLevel,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { setLockdownLevel, takeLockdownLevel } from '../../data/db.js';
import { logModerationAction } from '../../services/moderationLog.js';
import type { Command } from '../types.js';

export const raidLockdown: Command = {
  data: new SlashCommandBuilder()
    .setName('raid-lockdown')
    .setDescription('サーバーの参加認証レベルを引き上げて手動でロックダウンします')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addStringOption((o) =>
      o
        .setName('state')
        .setDescription('on: ロックダウンする / off: 解除する')
        .setRequired(true)
        .addChoices({ name: 'on(ロックダウンする)', value: 'on' }, { name: 'off(解除する)', value: 'off' }),
    )
    .addStringOption((o) => o.setName('reason').setDescription('理由').setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction) {
    const state = interaction.options.getString('state', true) as 'on' | 'off';
    const reason = interaction.options.getString('reason') ?? undefined;
    const guild = interaction.guild!;

    if (state === 'on') {
      await setLockdownLevel(guild.id, guild.verificationLevel);
      await guild.setVerificationLevel(GuildVerificationLevel.VeryHigh, reason ?? '手動ロックダウン');
    } else {
      const previous = (await takeLockdownLevel(guild.id)) ?? GuildVerificationLevel.Medium;
      await guild.setVerificationLevel(previous, reason ?? 'ロックダウン解除');
    }

    await logModerationAction({
      guild,
      action: state === 'on' ? 'RAID_LOCKDOWN_ON' : 'RAID_LOCKDOWN_OFF',
      moderator: interaction.user,
      reason,
    });

    await interaction.reply({
      content:
        state === 'on'
          ? '🚨 サーバーをロックダウンしました(参加認証レベル: 最高)。'
          : '✅ ロックダウンを解除しました(参加認証レベルを元に戻しました)。',
      ephemeral: true,
    });
  },
};
