// このファイルはTypeScriptからビルドされたものではなく、常にこの内容のまま存在する
// プレーンなJSファイル。ホスティングパネルの「起動ファイル」に何を指定されても
// (npm start経由でなくても)必ず最新のsrc/から作り直してから起動するための入口。
//
// 経緯: dist/ をそのまま「起動ファイル」に指定されると、パネルが npm install や
// npm start を経由しない限りビルドが走らず、古いdist/のまま動き続けてしまう問題があった。

import { execSync } from 'node:child_process';

console.log('[bootstrap] 最新のソースからビルドしています...');
execSync('npm run build', { stdio: 'inherit' });

console.log('[bootstrap] ビルド完了。ボットを起動します...');
await import('./dist/index.js');
