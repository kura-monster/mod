import type { Client } from 'discord.js';
import { logMemberJoin, logMemberLeave } from '../services/memberLog.js';

export function registerMemberEvents(client: Client): void {
  client.on('guildMemberAdd', (member) => {
    logMemberJoin(member).catch((error) => console.error('[memberLog] 入室ログの送信に失敗しました', error));
  });

  client.on('guildMemberRemove', (member) => {
    logMemberLeave(member).catch((error) => console.error('[memberLog] 退出ログの送信に失敗しました', error));
  });
}
