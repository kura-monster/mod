import { type ChatInputCommandInteraction, EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { config } from '../../config.js';
import { addReport } from '../../data/db.js';
import type { Command } from '../types.js';

export const report: Command = {
  data: new SlashCommandBuilder()
    .setName('report')
    .setDescription('メンバーの問題行動をモデレーターに通報します')
    .setDMPermission(false)
    .addUserOption((o) => o.setName('user').setDescription('対象ユーザー').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('通報理由').setRequired(true))
    .addStringOption((o) => o.setName('message_link').setDescription('該当メッセージのリンク(任意)').setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason', true);
    const messageLink = interaction.options.getString('message_link') ?? undefined;

    if (!config.reportChannelId) {
      await interaction.reply({
        content: '通報機能は現在設定されていません。サーバー管理者にお問い合わせください。',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const channel = await interaction.guild!.channels.fetch(config.reportChannelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      await interaction.reply({
        content: '通報の送信に失敗しました。サーバー管理者にお問い合わせください。',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const record = await addReport({
      guildId: interaction.guild!.id,
      reporterId: interaction.user.id,
      reporterTag: interaction.user.tag,
      targetId: target.id,
      targetTag: target.tag,
      reason,
      messageLink,
      timestamp: Date.now(),
    });

    const embed = new EmbedBuilder()
      .setColor(0xe67e22)
      .setTitle(`メンバーからの通報 #${record.id}`)
      .addFields(
        { name: '対象', value: `${target} (${target.tag})`, inline: true },
        { name: '通報者', value: `${interaction.user} (${interaction.user.tag})`, inline: true },
        { name: '理由', value: reason },
        ...(messageLink ? [{ name: '該当メッセージ', value: messageLink }] : []),
      )
      .setTimestamp();

    await channel.send({
      content: config.moderatorRoleId ? `<@&${config.moderatorRoleId}>` : undefined,
      embeds: [embed],
      allowedMentions: config.moderatorRoleId ? { roles: [config.moderatorRoleId] } : { parse: [] },
    });

    await interaction.reply({ content: '通報を受け付けました。ご協力ありがとうございます。', flags: MessageFlags.Ephemeral });
  },
};
