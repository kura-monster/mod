import type { Client } from 'discord.js';
import { reconcileServerTagRoles } from '../services/serverTagRole.js';

export function registerReadyEvent(client: Client): void {
  client.once('ready', (readyClient) => {
    console.log(`✅ ${readyClient.user.tag} としてログインしました。`);

    // オフライン中の鯖タグ変更・ロールの手動変更によるズレを起動時に是正する
    reconcileServerTagRoles(readyClient).catch((error) =>
      console.error('[serverTag] 起動時の同期に失敗しました', error),
    );
  });
}
