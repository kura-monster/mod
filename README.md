# Rula_KuraBot

入退室ログと、重大度別(軽度・中度・重度)のモデレーションログを備えたDiscordボット。
どのログをどのチャンネルに送るかはすべて環境変数で設定する。

## セットアップ

```bash
npm install
cp .env.example .env
# .env を編集してトークン等を設定
npm run deploy-commands   # スラッシュコマンドをDiscordに登録
npm run dev               # 開発起動(ファイル変更を監視)
# 本番運用時
npm run build
npm start
```

## 環境変数

`.env.example` を参照。

| 変数名 | 説明 |
| --- | --- |
| `DISCORD_TOKEN` | ボットのトークン(必須) |
| `CLIENT_ID` | アプリケーションID(必須) |
| `GUILD_ID` | 開発用ギルドID。設定するとそのサーバーのみ即時にコマンドが反映される |
| `JOIN_LOG_CHANNEL_ID` | 入室ログの送信先チャンネル。未設定なら送信しない |
| `LEAVE_LOG_CHANNEL_ID` | 退出ログの送信先チャンネル。未設定なら送信しない |
| `MOD_LOG_MINOR_CHANNEL_ID` | 軽度モデレーションログの送信先。未設定なら送信しない |
| `MOD_LOG_MODERATE_CHANNEL_ID` | 中度モデレーションログの送信先。未設定なら送信しない |
| `MOD_LOG_SEVERE_CHANNEL_ID` | 重度モデレーションログの送信先。未設定なら送信しない |
| `MODERATOR_ROLE_ID` | 重度ログ送信時にメンションするロール(モデレーション権限ロール) |

## モデレーションコマンドと重大度

新しい行為を追加したいときは [`src/types/moderation.ts`](src/types/moderation.ts) の `ACTIONS` にエントリを1つ足すだけで、
該当する重大度の送信先チャンネル振り分け・重度時のメンションが自動的に適用される。

### 軽度 (`MOD_LOG_MINOR_CHANNEL_ID`)
- `/warn` — 警告(DMも送信)
- `/nickname-reset` — ニックネームリセット
- `/voice-mute` / `/voice-unmute` — サーバーミュートの付与/解除
- `/slowmode` — チャンネルのスローモード変更

### 中度 (`MOD_LOG_MODERATE_CHANNEL_ID`)
- `/timeout` / `/untimeout` — タイムアウトの付与/解除
- `/kick` — キック
- `/voice-deafen` / `/voice-undeafen` — サーバースピーカーミュートの付与/解除
- `/lock` / `/unlock` — チャンネルロックの付与/解除
- `/purge` — メッセージ一括削除

### 重度 (`MOD_LOG_SEVERE_CHANNEL_ID`、`MODERATOR_ROLE_ID` をメンション)
- `/ban` — BAN
- `/unban` — BAN解除
- `/softban` — ソフトBAN(直近メッセージ削除後に再入室可能な状態にする)
- `/raid-lockdown on|off` — サーバー参加認証レベルを手動で最高まで引き上げ/元に戻す(Administrator限定)

### 記録の照会・設定確認(いずれも環境変数の値は変更しない読み取り専用コマンド)
- `/warnings <user>` — 警告の累計回数と直近の履歴を表示(永続DB)
- `/case <id>` — ケース番号からモデレーション記録の詳細を表示(永続DB)
- `/modstats [days]` — 直近N日間の対応件数を重大度別・実行者別に集計(永続DB)
- `/userinfo [user]` — アカウント作成日・参加日・警告累計・ロールを表示
- `/invites` — サーバーの有効な招待リンク一覧(作成者・使用回数)を表示。招待作成スパム対策の確認用
- `/automod-status` — 現在の `AUTOMOD_*` 設定値を一覧表示(設定変更はコマンドではなく環境変数で行う)

## 鯖タグ(Server Tag)連動ロール

Discordの「鯖タグ(Server Tag/Primary Guild)」機能で、指定サーバーのタグをプロフィールに
表示しているメンバーに自動でロールを付与し、非表示にした/別サーバーのタグに変えた場合は
自動で剥奪する([src/services/serverTagRole.ts](src/services/serverTagRole.ts))。

- `SERVER_TAG_ROLE_ID` を設定すると機能が有効になる(未設定なら何もしない)
- `SERVER_TAG_GUILD_ID` で「どのサーバーのタグを見るか」を指定できる。未設定なら `GUILD_ID`
  (このボットが動いているサーバー自身)が対象になる
- 反映タイミングは3つ
  1. メンバー参加時(参加した時点で既にタグを着用していた場合に対応)
  2. タグの着脱をリアルタイム検知(Discordの`userUpdate`イベント)
  3. ボット起動時に対象サーバーの全メンバーを走査して不整合を是正(オフライン中の変更に対応)

## 自動検知(荒らし対策)

`AUTOMOD_ENABLED=true`(既定)で有効になる。検知すると即座にメッセージ削除や
タイムアウト/キック/BANなどの自動対応を行い、重大度に応じたログチャンネルに送信する
(実行者としてボット自身が記録される)。`AUTOMOD_LOG_ONLY=true` にすると自動対応をせず
通知だけを行うお試しモードになる。しきい値はすべて `.env.example` の `AUTOMOD_*` から調整可能。
`AUTOMOD_EXEMPT_ROLE_IDS` で指定したロール、および ManageGuild 権限を持つメンバーは対象外。

メッセージ本文を検査するため、Discord Developer Portal で
**Privileged Gateway Intents → MESSAGE CONTENT INTENT** の有効化が必須(ボットが100サーバー以上に
導入される場合はDiscordの審査が必要)。

### 軽度
- NGワード検知(`AUTOMOD_BANNED_WORDS` / `AUTOMOD_BANNED_WORDS_REGEX`) — メッセージ削除のみ
- 大文字乱用(叫び)検知
- 絵文字乱用検知
- Zalgo(結合文字による装飾)テキスト検知
- 新規アカウントの参加検知(`AUTOMOD_MIN_ACCOUNT_AGE_MS`、既定はログのみ)
- 不審なユーザー名検知(ランダム英数字パターン=量産アカウントの疑い)

### 中度
- 連投スパム検知(同一内容の短時間連投)→ 10分タイムアウト
- チャンネル横断スパム検知(複数チャンネルへの同一投稿)→ 15分タイムアウト
- メッセージフラッド検知(短時間の大量投稿)→ 10分タイムアウト
- 添付ファイルフラッド検知 → 10分タイムアウト
- メンションスパム検知 → 15分タイムアウト
- 無許可のDiscord招待リンク検知(`AUTOMOD_INVITE_ALLOWLIST` で自サーバー招待を除外可)→ 10分タイムアウト
- URL大量投稿検知(`AUTOMOD_URL_LIMIT`、広告/フィッシングURLの連投)→ 10分タイムアウト
- **招待リンク作成スパム検知**(`AUTOMOD_INVITE_CREATE_LIMIT`/`_WINDOW_MS`、レイド用の大量発行対策)→ 招待削除+10分タイムアウト

### 重度(モデレーターにメンション)
- 詐欺・フィッシングの疑いがあるリンク/文言検知(Nitro詐欺等の定番パターン+`AUTOMOD_SCAM_EXTRA_KEYWORDS`)→ 自動BAN
- 重大NGワード検知(`AUTOMOD_SEVERE_BANNED_WORDS`、差別語・脅迫など)→ 自動キック
- レイド疑いの参加急増検知(`AUTOMOD_RAID_JOIN_LIMIT`/`_WINDOW_MS`)→ アラート、`AUTOMOD_RAID_AUTO_LOCKDOWN=true` で参加認証レベルを自動引き上げ
- **アンチNuke**: チャンネル/ロールの大量削除を検知して実行者を自動BAN(`AUTOMOD_ANTI_NUKE_LIMIT`/`_WINDOW_MS`)。
  乗っ取られた管理者アカウント等による破壊行為を想定しているため、通常の自動検知と異なり
  **ManageGuild権限保持者は自動的には除外しない**(サーバーオーナーと`AUTOMOD_EXEMPT_ROLE_IDS`のみ除外)。
  ボットに「監査ログを見る」権限が必要

### ニックネーム変更スパム(minor、罰則なしでログのみ)
- 短時間の連続ニックネーム変更を検知(`AUTOMOD_NICKNAME_CHANGE_LIMIT`/`_WINDOW_MS`)。フィルター回避目的の
  迷惑行為を可視化するための通知のみで、自動での制限は行わない

自動検知のうち「連投カウント・参加ラッシュ判定」のような数秒〜数分で意味を失うデータのみ
メモリ上で管理し、プロセス再起動でリセットされる([src/automod/state.ts](src/automod/state.ts))。
それ以外の恒久データはすべて下記のDBに永久保存される。

## 永続化DB(.json)

依存ライブラリなしの自作の軽量JSON DB([src/data/db.ts](src/data/db.ts))で、以下を永久保存する。

- **モデレーションケース履歴**: `/warn` 等の手動コマンドと自動検知の**すべて**の行為が、
  通知のたびに連番の「ケース番号」付きで記録される。`/case <id>` で照会可能。ログ通知の
  Embedフッターにも `ケース #番号` が表示される
- **警告(warn)の累計回数と履歴**: `/warn` のたびにユーザー単位で蓄積され、`/warnings <user>` で照会可能
- **ロックダウン前のサーバー参加認証レベル**: `/raid-lockdown` や自動ロックダウンで変更する前の値を
  保存し、解除時に正確に元へ戻す。ボットが再起動してもロックダウン状態を見失わない

保存先は既定で `data/db.json`(プロジェクト直下、初回起動時に自動作成)。`DB_FILE_PATH` で
任意のパスに変更可能。書き込みは一時ファイル→rename方式で行い、途中で異常終了しても
ファイルが壊れないようにしている。`data/` は `.gitignore` 済みなのでリポジトリにはコミットされない
(バックアップしたい場合は運用側で `data/db.json` を退避すること)。

複数プロセスでボットを冗長化する場合はファイルロックの制御がないため、この自作DBではなく
外部DB(Redis/PostgreSQL等)に置き換える必要がある。

## 管理画面(Web)

`.env` を毎回編集したり `/automod-status` で確認するのが面倒な場合のためのWeb管理画面。
Bot本体と同じプロセスでExpressサーバーが起動し、`AUTOMOD_*` 等の主要な設定を
ブラウザから閲覧・変更でき、**変更は即座にボットへ反映され、再起動は不要**。
ケース履歴・重大度別の統計もここで確認できる(モデレーション操作自体は引き続きDiscordの
スラッシュコマンドで行う設計。誤操作時の被害を抑えるため)。

### セットアップ

1. [Discord Developer Portal](https://discord.com/developers/applications) でこのボットのアプリケーションを開き、
   **OAuth2** タブで以下を行う
   - **Client Secret** を控える(`DISCORD_CLIENT_SECRET` に設定。Botトークンとは別物)
   - **Redirects** に `<ADMIN_PANEL_BASE_URL>/callback` を追加(例: `http://localhost:3000/callback`。
     本番でホスティングパネルが割り当てたURLを使う場合はそのURLに合わせる)
2. `.env` に以下を設定する

   ```
   GUILD_ID=対象サーバーのID(管理者権限の確認に使うため必須)
   DISCORD_CLIENT_SECRET=(手順1で控えたもの)
   ADMIN_PANEL_BASE_URL=http://localhost:3000(本番は実際の公開URL)
   ADMIN_PANEL_PORT=3000
   SESSION_SECRET=適当なランダム文字列(未設定でも動くが再起動でログアウトされる)
   ```
3. `npm run dev` または `npm start` でボットと同時に管理画面が起動する
4. ブラウザで `ADMIN_PANEL_BASE_URL` を開く → `/login` に自動転送 → Discordでログイン →
   対象サーバー(`GUILD_ID`)で **管理者(Administrator)権限** を持つアカウントのみアクセス可能
   (それ以外は403エラーになる)

### できること
- **設定**タブ: `config.ts` / `automod/config.ts` の主要項目(ログ送信先チャンネル、しきい値、
  NGワード、除外ロールなど)をグループ別に一覧・編集。変更内容は [src/data/db.ts](src/data/db.ts) の
  `settingsOverrides` に永久保存され、次回起動時にも自動で復元される
- **統計・ログ**タブ: 期間別のモデレーション対応件数(重大度別集計)と、直近のケース履歴を一覧表示

### 注意点
- `AUTOMOD_*` 環境変数はあくまで「初期値」になる。管理画面で一度変更すると、その項目は
  `data/db.json` の上書き値が優先される(環境変数を書き換えても反映されなくなる)。
  上書きを解除したい場合は `data/db.json` の `settingsOverrides` から該当キーを削除するか、
  管理画面で再度もとの値に変更すること
- `DISCORD_TOKEN` / `CLIENT_ID` / `GUILD_ID` はDiscord側の設定と密結合なため、意図的に
  管理画面からは変更できない(env変更+再起動が必要)
- モデレーション操作(BAN/kick/timeout等)は管理画面からは実行できない設計。誤操作の被害を
  抑えるため、実行はDiscordのスラッシュコマンド経由に限定している
- 管理画面を無効化したい場合は `ADMIN_PANEL_ENABLED=false`

## 必要なボット権限(Botの招待時)

Manage Nicknames / Mute Members / Deafen Members / Moderate Members / Kick Members /
Manage Channels / Manage Messages / Ban Members / Manage Server(ロックダウン・招待一覧取得用) /
**View Audit Log(アンチNukeの実行者特定に必須)** / **Manage Roles(鯖タグ連動ロールの付与/剥奪に必須)**
に加え、Gateway Intent として `SERVER MEMBERS INTENT` と `MESSAGE CONTENT INTENT` を
Developer Portalで有効化すること(`GuildInvites`インテントは特権インテントではないため
コード側の設定のみで有効)。

なお鯖タグ連動ロールを機能させるには、Discordの権限階層の仕様上、**Botのロールを
`SERVER_TAG_ROLE_ID`のロールより上位に配置する**必要がある(下位のままだと付与/剥奪が失敗する)。

## ディレクトリ構成

```
src/
  config.ts              環境変数の読み込み
  index.ts                エントリーポイント
  deploy-commands.ts      スラッシュコマンド登録スクリプト
  types/moderation.ts     モデレーション行為と重大度の定義(拡張ポイント)
  data/
    db.ts                    .jsonファイルへの永久保存を行う自作DB(ケース履歴/警告/ロックダウン状態)
    types.ts                  DBスキーマの型定義
  services/
    moderationLog.ts       重大度別ログ送信ロジック(送信のたびにDBへケースを記録)
    memberLog.ts            入退室ログ送信ロジック
  automod/
    config.ts               AUTOMOD_* 環境変数の読み込み
    state.ts                 スパム/レイド/招待作成/ニックネーム/Nuke判定用のインメモリ状態管理
    exempt.ts                 通常の自動検知における除外判定(ManageGuild/除外ロール)
    textDetection.ts         NGワード/招待リンク/詐欺リンク/URL/大文字/絵文字/Zalgoの検知ロジック
    actions.ts                削除/タイムアウト/キック/BANの安全な実行ラッパー
    messageAutomod.ts         メッセージ系検知のオーケストレーター
    memberAutomod.ts          参加(レイド)系検知のオーケストレーター
    inviteAutomod.ts           招待リンク作成スパムのオーケストレーター
    memberUpdateAutomod.ts     ニックネーム変更スパムのオーケストレーター
    auditAutomod.ts             アンチNuke(チャンネル/ロール大量削除)のオーケストレーター
  events/                  ready / 入退室ログ / インタラクション / 自動検知の各イベント登録
  commands/moderation/      各スラッシュコマンドの実装
  web/
    config.ts                ADMIN_PANEL_* / DISCORD_CLIENT_SECRET / SESSION_SECRET の読み込み
    settingsSchema.ts         管理画面で編集できる設定項目の一覧(拡張ポイント)
    pathUtil.ts                'automod.duplicate.limit'のようなドットパスの取得/設定ユーティリティ
    validate.ts                 設定値の型バリデーション
    configBridge.ts              settingsSchema⇔config/automodConfigの橋渡し、DBへの永続化
    server.ts                    Express製サーバー本体(OAuth2ログイン・設定/統計API)
    public/                       フロントエンド(素のHTML/CSS/JS、ビルド不要)
```
