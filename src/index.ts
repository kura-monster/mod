import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { config } from './config.js';
import { commands } from './commands/index.js';
import { registerReadyEvent } from './events/ready.js';
import { registerMemberEvents } from './events/memberEvents.js';
import { registerInteractionEvent } from './events/interactionCreate.js';
import { registerAutomodEvents } from './events/automodEvents.js';
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

// 管理画面で変更された設定(data/db.json)をAUTOMOD_*の初期値に上書きしてから起動する
await loadPersistedSettings();
startWebPanel(client);

client.login(config.token);
