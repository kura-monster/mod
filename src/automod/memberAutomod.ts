import { GuildVerificationLevel, type GuildMember } from 'discord.js';
import { setLockdownLevel } from '../data/db.js';
import { logModerationAction } from '../services/moderationLog.js';
import { kickMemberSafe } from './actions.js';
import { automodConfig } from './config.js';
import { isExemptMember } from './exempt.js';
import { pushAndGetJoinHistory } from './state.js';

// ランダムな英数字のみで構成された典型的な量産アカウント名を検知する
const SUSPICIOUS_USERNAME_REGEX = /^[a-z0-9]{6,}$/i;

let lastRaidAlertAt = 0;

async function handleRaidDetected(member: GuildMember, joinCount: number): Promise<void> {
  // 通知が連投されないよう、レイド警報は最短30秒間隔にする
  const now = Date.now();
  if (now - lastRaidAlertAt < 30_000) return;
  lastRaidAlertAt = now;

  await logModerationAction({
    guild: member.guild,
    action: 'AUTO_RAID_JOIN_SPIKE',
    moderator: member.client.user!,
    target: `直近${automodConfig.raid.joinWindowMs / 1000}秒間で${joinCount}人が参加`,
    reason: 'レイドの疑いがある急激な参加を検知しました',
  });

  if (automodConfig.raid.autoLockdown && member.guild.verificationLevel !== GuildVerificationLevel.VeryHigh) {
    await setLockdownLevel(member.guild.id, member.guild.verificationLevel);
    await member.guild
      .setVerificationLevel(GuildVerificationLevel.VeryHigh, '自動レイド対策によるロックダウン')
      .catch((error) => console.error('[automod] サーバー認証レベルの引き上げに失敗しました', error));
  }
}

async function handleNewAccount(member: GuildMember, accountAgeMs: number): Promise<void> {
  const ageMinutes = Math.floor(accountAgeMs / 60_000);
  const willKick = automodConfig.newAccount.action === 'kick';

  await logModerationAction({
    guild: member.guild,
    action: 'AUTO_NEW_ACCOUNT_JOIN',
    moderator: member.client.user!,
    target: member.user,
    reason: `作成から${ageMinutes}分の新規アカウントが参加しました`,
    extra: willKick ? { 対応: '自動キックしました' } : { 対応: 'ログのみ(AUTOMOD_NEW_ACCOUNT_ACTION=flag)' },
  });

  if (willKick && !automodConfig.logOnly) {
    await kickMemberSafe(member, '新規アカウントのため自動キック(AUTOMOD_NEW_ACCOUNT_ACTION=kick)');
  }
}

export async function runMemberAutomod(member: GuildMember): Promise<void> {
  if (!automodConfig.enabled) return;
  if (isExemptMember(member)) return;

  const now = Date.now();

  // 1. レイド検知(短時間の大量参加)
  const allJoins = pushAndGetJoinHistory(member.guild.id, now);
  const recentJoins = allJoins.filter((t) => now - t <= automodConfig.raid.joinWindowMs);
  if (recentJoins.length >= automodConfig.raid.joinLimit) {
    await handleRaidDetected(member, recentJoins.length);
  }

  // 2. 新規アカウント検知
  if (automodConfig.newAccount.minAgeMs > 0) {
    const accountAgeMs = now - member.user.createdTimestamp;
    if (accountAgeMs < automodConfig.newAccount.minAgeMs) {
      await handleNewAccount(member, accountAgeMs);
    }
  }

  // 3. 不審なユーザー名検知(量産アカウントの疑い)
  if (automodConfig.suspiciousUsername.enabled && SUSPICIOUS_USERNAME_REGEX.test(member.user.username)) {
    await logModerationAction({
      guild: member.guild,
      action: 'AUTO_SUSPICIOUS_USERNAME',
      moderator: member.client.user!,
      target: member.user,
      reason: 'ランダム英数字パターンのユーザー名を検知しました(量産アカウントの疑い)',
    });
  }
}
