import { type ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { automodConfig } from '../../automod/config.js';
import type { Command } from '../types.js';

export const automodStatus: Command = {
  data: new SlashCommandBuilder()
    .setName('automod-status')
    .setDescription('現在の自動検知(荒らし対策)の設定状況を表示します(設定変更はAUTOMOD_*環境変数で行ってください)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false),

  async execute(interaction: ChatInputCommandInteraction) {
    const c = automodConfig;

    const embed = new EmbedBuilder()
      .setColor(c.enabled ? 0x2ecc71 : 0x95a5a6)
      .setTitle('🛡️ 自動検知(荒らし対策)の設定状況')
      .setDescription(
        `有効: **${c.enabled ? 'ON' : 'OFF'}** / モード: **${c.logOnly ? 'ログのみ' : '自動対応あり'}**\n設定は \`AUTOMOD_*\` 環境変数で変更してください。`,
      )
      .addFields(
        { name: '連投スパム', value: `${c.duplicate.limit}回 / ${c.duplicate.windowMs / 1000}秒`, inline: true },
        {
          name: 'クロスポスト',
          value: `${c.crosspost.channelLimit}ch投稿 / ${c.crosspost.windowMs / 1000}秒`,
          inline: true,
        },
        { name: 'メッセージフラッド', value: `${c.flood.limit}件 / ${c.flood.windowMs / 1000}秒`, inline: true },
        { name: '添付ファイル連投', value: `${c.attachment.limit}件 / ${c.attachment.windowMs / 1000}秒`, inline: true },
        { name: 'メンション上限', value: `${c.mention.limit}件`, inline: true },
        { name: 'URL上限', value: `${c.url.limit}件`, inline: true },
        { name: '絵文字上限', value: `${c.emoji.limit}個`, inline: true },
        { name: '大文字比率', value: `${Math.round(c.caps.ratio * 100)}%(${c.caps.minLength}文字以上)`, inline: true },
        { name: 'Zalgo検知', value: c.zalgo.enabled ? 'ON' : 'OFF', inline: true },
        { name: '招待リンク投稿ブロック', value: c.invite.block ? 'ON' : 'OFF', inline: true },
        {
          name: '招待リンク作成スパム',
          value: `${c.inviteCreate.limit}件 / ${c.inviteCreate.windowMs / 1000}秒`,
          inline: true,
        },
        { name: '詐欺リンクブロック', value: c.scamLink.block ? 'ON' : 'OFF', inline: true },
        { name: 'NGワード登録数', value: `通常${c.bannedWords.length}件 / 重大${c.severeBannedWords.length}件`, inline: true },
        {
          name: 'ニックネームスパム',
          value: `${c.nicknameSpam.limit}回 / ${c.nicknameSpam.windowMs / 1000}秒`,
          inline: true,
        },
        {
          name: 'レイド検知',
          value: `${c.raid.joinLimit}人 / ${c.raid.joinWindowMs / 1000}秒(自動ロックダウン: ${c.raid.autoLockdown ? 'ON' : 'OFF'})`,
          inline: true,
        },
        {
          name: '新規アカウント検知',
          value: c.newAccount.minAgeMs > 0 ? `${Math.round(c.newAccount.minAgeMs / 60000)}分未満 → ${c.newAccount.action}` : '無効',
          inline: true,
        },
        {
          name: 'アンチNuke',
          value: c.antiNuke.enabled ? `${c.antiNuke.limit}回 / ${c.antiNuke.windowMs / 1000}秒` : 'OFF',
          inline: true,
        },
        {
          name: '除外ロール',
          value: c.exemptRoleIds.length > 0 ? c.exemptRoleIds.map((id) => `<@&${id}>`).join(', ') : 'なし',
        },
      );

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
