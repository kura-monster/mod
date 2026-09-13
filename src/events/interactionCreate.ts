import { MessageFlags, type Client } from 'discord.js';

export function registerInteractionEvent(client: Client): void {
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`[commands] ${interaction.commandName} の実行中にエラーが発生しました`, error);
      const payload = { content: 'コマンドの実行中にエラーが発生しました。', flags: MessageFlags.Ephemeral } as const;
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload).catch(() => {});
      } else {
        await interaction.reply(payload).catch(() => {});
      }
    }
  });
}
