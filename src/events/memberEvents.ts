import type { Client } from 'discord.js';
import { logMemberJoin, logMemberLeave } from '../services/memberLog.js';
import { syncServerTagRole } from '../services/serverTagRole.js';

export function registerMemberEvents(client: Client): void {
  client.on('guildMemberAdd', (member) => {
    logMemberJoin(member).catch((error) => console.error('[memberLog] 入室ログの送信に失敗しました', error));
    // 参加時点で既に鯖タグを着用している場合に備えて即時同期する
    syncServerTagRole(member).catch((error) => console.error('[serverTag] 参加時の同期に失敗しました', error));
  });

  client.on('guildMemberRemove', (member) => {
    logMemberLeave(member).catch((error) => console.error('[memberLog] 退出ログの送信に失敗しました', error));
  });
}
