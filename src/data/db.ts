import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { optional } from '../config.js';
import type { DatabaseSchema, ModerationCaseRecord, WarningRecord } from './types.js';

/**
 * 全データを1つの .json ファイルに永続化する、依存ライブラリ不要の簡易DB。
 * ・書き込みはキューで直列化し、一時ファイル→rename で原子的に保存する
 * ・ボットは通常単一プロセスで動く前提。複数プロセスで冗長化する場合は
 *   外部DB(Redis/PostgreSQL等)に置き換えること
 */

const DB_PATH = optional('DB_FILE_PATH')
  ? resolve(optional('DB_FILE_PATH')!)
  : fileURLToPath(new URL('../../data/db.json', import.meta.url));

const DEFAULT_DB: DatabaseSchema = {
  nextCaseId: 1,
  nextWarningId: 1,
  cases: [],
  warnings: {},
  lockdown: {},
  settingsOverrides: {},
};

let cache: DatabaseSchema | null = null;
let writeQueue: Promise<void> = Promise.resolve();

async function persist(data: DatabaseSchema): Promise<void> {
  await mkdir(dirname(DB_PATH), { recursive: true });
  const tmpPath = `${DB_PATH}.tmp`;
  await writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
  await rename(tmpPath, DB_PATH);
}

async function load(): Promise<DatabaseSchema> {
  if (cache) return cache;

  try {
    const raw = await readFile(DB_PATH, 'utf-8');
    cache = { ...DEFAULT_DB, ...(JSON.parse(raw) as Partial<DatabaseSchema>) };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      cache = { ...DEFAULT_DB };
      await persist(cache);
    } else {
      console.error(`[db] ${DB_PATH} の読み込みに失敗したため、初期状態で起動します`, error);
      cache = { ...DEFAULT_DB };
    }
  }

  return cache;
}

function queueSave(): void {
  writeQueue = writeQueue
    .then(() => persist(cache!))
    .catch((error) => console.error('[db] db.json の保存に失敗しました', error));
}

export async function addCase(record: Omit<ModerationCaseRecord, 'id'>): Promise<ModerationCaseRecord> {
  const db = await load();
  const full: ModerationCaseRecord = { ...record, id: db.nextCaseId };
  db.cases.push(full);
  db.nextCaseId += 1;
  queueSave();
  return full;
}

export async function getCase(id: number): Promise<ModerationCaseRecord | undefined> {
  const db = await load();
  return db.cases.find((c) => c.id === id);
}

export async function getCasesSince(guildId: string, sinceTimestamp: number): Promise<ModerationCaseRecord[]> {
  const db = await load();
  return db.cases.filter((c) => c.guildId === guildId && c.timestamp >= sinceTimestamp);
}

export async function getRecentCases(guildId: string, limit: number): Promise<ModerationCaseRecord[]> {
  const db = await load();
  return db.cases
    .filter((c) => c.guildId === guildId)
    .slice(-limit)
    .reverse();
}

export async function addWarning(
  guildId: string,
  userId: string,
  warning: Omit<WarningRecord, 'id'>,
): Promise<{ warning: WarningRecord; total: number }> {
  const db = await load();
  db.warnings[guildId] ??= {};
  db.warnings[guildId][userId] ??= [];
  const full: WarningRecord = { ...warning, id: db.nextWarningId };
  db.warnings[guildId][userId].push(full);
  db.nextWarningId += 1;
  queueSave();
  return { warning: full, total: db.warnings[guildId][userId].length };
}

export async function getWarnings(guildId: string, userId: string): Promise<WarningRecord[]> {
  const db = await load();
  return db.warnings[guildId]?.[userId] ?? [];
}

export async function setLockdownLevel(guildId: string, level: number): Promise<void> {
  const db = await load();
  db.lockdown[guildId] = level;
  queueSave();
}

export async function takeLockdownLevel(guildId: string): Promise<number | undefined> {
  const db = await load();
  const level = db.lockdown[guildId];
  delete db.lockdown[guildId];
  queueSave();
  return level;
}

export async function getSettingsOverrides(): Promise<Record<string, unknown>> {
  const db = await load();
  return db.settingsOverrides;
}

export async function setSettingOverride(key: string, value: unknown): Promise<void> {
  const db = await load();
  db.settingsOverrides[key] = value;
  queueSave();
}
