import { REST, Routes } from 'discord.js';
import { config } from './config.js';
import { commands } from './commands/index.js';

const body = [...commands.values()].map((command) => command.data.toJSON());

const rest = new REST().setToken(config.token);

async function main() {
  console.log(`⏳ ${body.length} 件のスラッシュコマンドを登録します...`);

  const route = config.guildId
    ? Routes.applicationGuildCommands(config.clientId, config.guildId)
    : Routes.applicationCommands(config.clientId);

  await rest.put(route, { body });

  console.log('✅ スラッシュコマンドの登録が完了しました。');
}

main().catch((error) => {
  console.error('❌ コマンド登録に失敗しました', error);
  process.exit(1);
});
