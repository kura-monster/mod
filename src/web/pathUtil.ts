type PlainObject = Record<string, unknown>;

export function getByPath(obj: PlainObject, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc === null || typeof acc !== 'object') return undefined;
    return (acc as PlainObject)[key];
  }, obj);
}

export function setByPath(obj: PlainObject, path: string, value: unknown): void {
  const parts = path.split('.');
  const lastKey = parts.pop();
  if (!lastKey) return;

  let target: PlainObject = obj;
  for (const part of parts) {
    const next = target[part];
    if (next === null || typeof next !== 'object') {
      throw new Error(`設定パスが不正です: ${path}`);
    }
    target = next as PlainObject;
  }

  target[lastKey] = value;
}
