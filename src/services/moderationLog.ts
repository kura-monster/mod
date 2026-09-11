import { EmbedBuilder, type Guild, type User } from 'discord.js';
import { config } from '../config.js';
import { addCase } from '../data/db.js';
import { ACTIONS, type ActionKey, SEVERITY_COLOR, SEVERITY_LABEL } from '../types/moderation.js';

interface LogModerationActionParams {
  guild: Guild;
  action: ActionKey;
  moderator: User;
  target?: User | string;
  reason?: string;
  extra?: Record<string, string>;
}

function formatTarget(target: User | string | undefined): string {
  if (!target) return '—';
  return typeof target === 'string' ? target : `${target} (${target.tag})`;
}

/**
 * モデレーション行為を記録・通知する。
 * ・data/db.json(またはDB_FILE_PATHで指定したファイル)にケースとして永久保存する
 * ・重大度に紐づく環境変数(MOD_LOG_*_CHANNEL_ID)のチャンネルにも通知を送る(未設定ならスキップ)
 * ・重度ログは MODERATOR_ROLE_ID をメンションする
 */
export async function logModerationAction(params: LogModerationActionParams): Promise<void> {
  const { guild, action, moderator, target, reason, extra } = params;
  const meta = ACTIONS[action];

  const record = await addCase({
    guildId: guild.id,
    action,
    severity: meta.severity,
    moderatorId: moderator.id,
    moderatorTag: moderator.tag,
    targetId: target && typeof target !== 'string' ? target.id : undefined,
    targetLabel: formatTarget(target),
    reason: reason ?? '理由未記載',
    timestamp: Date.now(),
  });

  const channelId = config.modLogChannelId[meta.severity];

  if (!channelId) {
    console.warn(
      `[modlog] ${SEVERITY_LABEL[meta.severity]}ログのチャンネルが未設定のため通知をスキップしました (action=${action}, case=#${record.id})`,
    );
    return;
  }

  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) {
    console.warn(
      `[modlog] チャンネル ${channelId} が見つからないか、テキストチャンネルではありません (action=${action}, case=#${record.id})`,
    );
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(SEVERITY_COLOR[meta.severity])
    .setTitle(`${meta.emoji} ${meta.label}`)
    .addFields(
      { name: '対象', value: formatTarget(target), inline: true },
      { name: '実行者', value: `${moderator} (${moderator.tag})`, inline: true },
      { name: '重大度', value: SEVERITY_LABEL[meta.severity], inline: true },
      { name: '理由', value: reason ?? '理由未記載' },
    )
    .setFooter({ text: `ケース #${record.id}` })
    .setTimestamp();

  if (extra) {
    for (const [name, value] of Object.entries(extra)) {
      embed.addFields({ name, value });
    }
  }

  const shouldMentionModerators = meta.severity === 'severe' && Boolean(config.moderatorRoleId);

  await channel.send({
    content: shouldMentionModerators ? `<@&${config.moderatorRoleId}>` : undefined,
    embeds: [embed],
    allowedMentions: shouldMentionModerators ? { roles: [config.moderatorRoleId!] } : { parse: [] },
  });
}
