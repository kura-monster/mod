import { type ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { getWarnings } from '../../data/db.js';
import type { Command } from '../types.js';

export const userinfo: Command = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('メンバーの情報(アカウント作成日・参加日・警告累計など)を表示します')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false)
    .addUserOption((o) => o.setName('user').setDescription('対象ユーザー(未指定で自分)').setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser('user') ?? interaction.user;
    const member = await interaction.guild!.members.fetch(target.id).catch(() => null);
    const warningList = await getWarnings(interaction.guild!.id, target.id);

    const roles = member
      ? member.roles.cache
          .filter((r) => r.id !== interaction.guild!.id)
          .map((r) => `${r}`)
          .join(' ') || 'なし'
      : '不明(サーバー外)';

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle(`👤 ${target.tag}`)
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: 'ユーザーID', value: target.id, inline: true },
        { name: 'アカウント作成日', value: `<t:${Math.floor(target.createdTimestamp / 1000)}:R>`, inline: true },
        {
          name: 'サーバー参加日',
          value: member?.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : '不明',
          inline: true,
        },
        { name: '警告累計', value: `${warningList.length}回`, inline: true },
        { name: 'ロール', value: roles },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
