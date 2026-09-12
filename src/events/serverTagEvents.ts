import type { Client } from 'discord.js';
import { config } from '../config.js';
import { syncServerTagRole } from '../services/serverTagRole.js';

/**
 * 鯖タグ(Server Tag/Primary Guild)の着脱をリアルタイムに検知してロールへ反映する。
 * userUpdateはユーザーがプロフィールを変更した際に発火するクライアント全体のイベントなので、
 * 対象サーバーのメンバーかどうかをここで絞り込む。
 */
export function registerServerTagEvents(client: Client): void {
  client.on('userUpdate', (oldUser, newUser) => {
    const guildId = config.serverTag.guildId;
    if (!config.serverTag.roleId || !guildId) return;

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return;

    const member = guild.members.cache.get(newUser.id);
    if (!member) return;

    syncServerTagRole(member).catch((error) => console.error('[serverTag] userUpdate時の同期に失敗しました', error));
  });
}
