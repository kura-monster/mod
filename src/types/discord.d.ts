import type { Collection } from 'discord.js';
import type { Command } from '../commands/types.js';

declare module 'discord.js' {
  interface Client {
    commands: Collection<string, Command>;
  }
}
