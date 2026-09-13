import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { config } from './config.js';
import { commands } from './commands/index.js';
import { deploySlashCommands } from './commands/deploy.js';
import { registerReadyEvent } from './events/ready.js';
import { registerMemberEvents } from './events/memberEvents.js';
import { registerInteractionEvent } from './events/interactionCreate.js';
import { registerAutomodEvents } from './events/automodEvents.js';
import { registerServerTagEvents } from './events/serverTagEvents.js';
import { loadPersistedSettings } from './web/configBridge.js';
import { startWebPanel } from './web/server.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    // NGワード/招待リンク/大文字乱用などメッセージ本文を検査する荒らし対策に必須
    // Discord Developer Portal 側で「MESSAGE CONTENT INTENT」の有効化も必要
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildModeration,
    // 招待リンク作成スパム検知(inviteCreate)に必須。特権インテントではない
    GatewayIntentBits.GuildInvites,
  ],
  partials: [Partials.GuildMember, Partials.User],
});

client.commands = commands;

registerReadyEvent(client);
registerMemberEvents(client);
registerInteractionEvent(client);
registerAutomodEvents(client);
registerServerTagEvents(client);

// 管理画面で変更された設定(data/db.json)をAUTOMOD_*の初期値に上書きしてから起動する
await loadPersistedSettings();
await startWebPanel(client);

// 起動のたびに自動でスラッシュコマンドを登録する(npm run deploy-commandsを毎回手動実行しなくてよい)
try {
  console.log(`${commands.size} 件のスラッシュコマンドを登録しています...`);
  await deploySlashCommands();
  console.log('スラッシュコマンドの登録が完了しました。');
} catch (error) {
  console.error('スラッシュコマンドの登録に失敗しました', error);
}

client.login(config.token);
