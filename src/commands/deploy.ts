import { REST, Routes } from 'discord.js';
import { config } from '../config.js';
import { commands } from './index.js';

/**
 * スラッシュコマンドをDiscordに登録する。
 * GUILD_IDが設定されていればそのサーバー限定(即時反映)、未設定ならグローバル
 * (反映まで最大1時間程度)に登録する。
 */
export async function deploySlashCommands(): Promise<void> {
  const body = [...commands.values()].map((command) => command.data.toJSON());
  const rest = new REST().setToken(config.token);

  const route = config.guildId
    ? Routes.applicationGuildCommands(config.clientId, config.guildId)
    : Routes.applicationCommands(config.clientId);

  await rest.put(route, { body });
}
