import type { SettingField } from './settingsSchema.js';

const SNOWFLAKE_REGEX = /^\d{15,25}$/;

/** null以外を返した場合はそのままエラーメッセージとして扱う */
export function validateSettingValue(field: SettingField, value: unknown): string | null {
  switch (field.type) {
    case 'number':
      return typeof value === 'number' && Number.isFinite(value) ? null : '数値を指定してください';
    case 'boolean':
      return typeof value === 'boolean' ? null : 'true/falseを指定してください';
    case 'string':
      return typeof value === 'string' ? null : '文字列を指定してください';
    case 'channel':
    case 'role':
      if (typeof value !== 'string') return '文字列(チャンネル/ロールID)を指定してください';
      return value === '' || SNOWFLAKE_REGEX.test(value) ? null : 'IDの形式が正しくありません(空欄で未設定)';
    case 'stringList':
      return Array.isArray(value) && value.every((v) => typeof v === 'string')
        ? null
        : '文字列の配列を指定してください';
    case 'select':
      return typeof value === 'string' && (field.options ?? []).includes(value)
        ? null
        : `${(field.options ?? []).join(' / ')} のいずれかを指定してください`;
    default:
      return '不明な設定項目です';
  }
}
