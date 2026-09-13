import { type ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { webConfig } from '../../web/config.js';
import { createLoginCode } from '../../web/loginCodes.js';
import type { Command } from '../types.js';

export const adminLogin: Command = {
  data: new SlashCommandBuilder()
    .setName('admin-login')
    .setDescription('管理画面にログインするためのワンタイムコードを発行します')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),

  async execute(interaction: ChatInputCommandInteraction) {
    const code = createLoginCode(interaction.user.id, interaction.user.tag);
    const loginUrl = `${webConfig.baseUrl}/login`;

    await interaction.reply({
      content: `🔑 管理画面ログイン用のワンタイムコード: **${code}**\n5分間だけ有効です。${loginUrl} で入力してください。`,
      ephemeral: true,
    });
  },
};
