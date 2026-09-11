import type { Client } from 'discord.js';

export function registerReadyEvent(client: Client): void {
  client.once('ready', (readyClient) => {
    console.log(`✅ ${readyClient.user.tag} としてログインしました。`);
  });
}
