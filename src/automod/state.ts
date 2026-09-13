/**
 * 荒らし対策の各種スライディングウィンドウ判定に使う、インメモリの状態管理。
 * ここで扱うのは数秒〜数分で意味を失う一時的なデータ(連投・参加ラッシュの検知用)のみで、
 * 意図的に永久保存はしない(プロセス再起動でリセットされる)。
 * 警告履歴やケース記録などの恒久データは data/db.json ([src/data/db.ts](../data/db.ts)) を参照。
 * ボットを複数プロセスで動かす場合はここを外部ストア(Redis等)に差し替える必要がある。
 */

interface RecentMessage {
  content: string;
  timestamp: number;
  channelId: string;
  hasAttachment: boolean;
}

const MESSAGE_HISTORY_MAX_MS = 5 * 60_000;
const MESSAGE_HISTORY_MAX_ENTRIES = 50;
const userMessageHistory = new Map<string, RecentMessage[]>();

export function pushAndGetMessageHistory(userId: string, entry: RecentMessage): RecentMessage[] {
  const existing = userMessageHistory.get(userId) ?? [];
  const cutoff = entry.timestamp - MESSAGE_HISTORY_MAX_MS;
  let pruned = existing.filter((m) => m.timestamp >= cutoff);
  pruned.push(entry);
  if (pruned.length > MESSAGE_HISTORY_MAX_ENTRIES) {
    pruned = pruned.slice(pruned.length - MESSAGE_HISTORY_MAX_ENTRIES);
  }
  userMessageHistory.set(userId, pruned);
  return pruned;
}

/** タイムスタンプの配列だけを保持する単純なスライディングウィンドウ用トラッカーを作る */
function createTimestampTracker(maxAgeMs: number) {
  const store = new Map<string, number[]>();

  function pushAndGet(key: string, timestamp: number): number[] {
    const existing = store.get(key) ?? [];
    const cutoff = timestamp - maxAgeMs;
    const pruned = existing.filter((t) => t >= cutoff);
    pruned.push(timestamp);
    store.set(key, pruned);
    return pruned;
  }

  function cleanup(now: number): void {
    for (const [key, timestamps] of store) {
      const last = timestamps.at(-1);
      if (last === undefined || now - last > maxAgeMs) {
        store.delete(key);
      }
    }
  }

  return { pushAndGet, cleanup };
}

const TRACKER_MAX_MS = 5 * 60_000;

const joinTracker = createTimestampTracker(TRACKER_MAX_MS);
export function pushAndGetJoinHistory(guildId: string, timestamp: number): number[] {
  return joinTracker.pushAndGet(guildId, timestamp);
}

const inviteCreateTracker = createTimestampTracker(TRACKER_MAX_MS);
export function pushAndGetInviteCreationHistory(userId: string, timestamp: number): number[] {
  return inviteCreateTracker.pushAndGet(userId, timestamp);
}

const nicknameChangeTracker = createTimestampTracker(TRACKER_MAX_MS);
export function pushAndGetNicknameChangeHistory(userId: string, timestamp: number): number[] {
  return nicknameChangeTracker.pushAndGet(userId, timestamp);
}

// key は `${guildId}:${executorId}` を想定
const nukeActionTracker = createTimestampTracker(TRACKER_MAX_MS);
export function pushAndGetNukeActionHistory(key: string, timestamp: number): number[] {
  return nukeActionTracker.pushAndGet(key, timestamp);
}

// 使われなくなった履歴をメモリから定期的に掃除する
setInterval(
  () => {
    const now = Date.now();
    for (const [userId, history] of userMessageHistory) {
      const last = history.at(-1);
      if (!last || now - last.timestamp > MESSAGE_HISTORY_MAX_MS) {
        userMessageHistory.delete(userId);
      }
    }
    joinTracker.cleanup(now);
    inviteCreateTracker.cleanup(now);
    nicknameChangeTracker.cleanup(now);
    nukeActionTracker.cleanup(now);
  },
  5 * 60_000,
).unref();
