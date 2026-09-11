import { config } from '../config.js';
import { automodConfig } from '../automod/config.js';
import { getSettingsOverrides, setSettingOverride } from '../data/db.js';
import { getByPath, setByPath } from './pathUtil.js';
import { findSettingField, SETTINGS_SCHEMA } from './settingsSchema.js';
import { validateSettingValue } from './validate.js';

/**
 * settingsSchema.ts の key を実際の設定オブジェクト(config / automodConfig)に橋渡しする。
 * 'automod.' で始まる key は automodConfig を、それ以外は config を対象にする。
 */
function resolveTarget(key: string): { root: Record<string, unknown>; path: string } {
  if (key.startsWith('automod.')) {
    return { root: automodConfig as unknown as Record<string, unknown>, path: key.slice('automod.'.length) };
  }
  return { root: config as unknown as Record<string, unknown>, path: key };
}

export function getSettingValue(key: string): unknown {
  const { root, path } = resolveTarget(key);
  return getByPath(root, path);
}

function applyInMemory(key: string, value: unknown): void {
  const { root, path } = resolveTarget(key);
  setByPath(root, path, value);
}

export function getEffectiveSettings(): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const field of SETTINGS_SCHEMA) {
    values[field.key] = getSettingValue(field.key);
  }
  return values;
}

/** 起動時に data/db.json へ永久保存済みの上書き設定を読み込み、メモリ上の設定に反映する */
export async function loadPersistedSettings(): Promise<void> {
  const overrides = await getSettingsOverrides();
  for (const [key, value] of Object.entries(overrides)) {
    const field = findSettingField(key);
    if (!field) {
      console.warn(`[web] db.jsonに未知の設定キーが保存されていたため無視しました: ${key}`);
      continue;
    }
    try {
      applyInMemory(key, value);
    } catch (error) {
      console.error(`[web] 設定 ${key} の反映に失敗しました`, error);
    }
  }
}

/** 管理画面からの変更を検証のうえメモリに即時反映し、DBへ永久保存する */
export async function updateSettingByKey(key: string, value: unknown): Promise<void> {
  const field = findSettingField(key);
  if (!field) {
    throw new Error(`不明な設定キーです: ${key}`);
  }

  const error = validateSettingValue(field, value);
  if (error) {
    throw new Error(error);
  }

  applyInMemory(key, value);
  await setSettingOverride(key, value);
}
