import { commands } from './commands/index.js';
import { deploySlashCommands } from './commands/deploy.js';

async function main() {
  console.log(`${commands.size} 件のスラッシュコマンドを登録します...`);
  await deploySlashCommands();
  console.log('スラッシュコマンドの登録が完了しました。');
}

main().catch((error) => {
  console.error('コマンド登録に失敗しました', error);
  process.exit(1);
});
