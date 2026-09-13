const URL_REGEX = /https?:\/\/\S+/gi;

export function countUrls(content: string): number {
  return content.match(URL_REGEX)?.length ?? 0;
}

const DISCORD_INVITE_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:discord\.gg|discord(?:app)?\.com\/invite)\/([a-zA-Z0-9-]+)/gi;

export function extractInviteCodes(content: string): string[] {
  const codes: string[] = [];
  for (const match of content.matchAll(DISCORD_INVITE_REGEX)) {
    if (match[1]) codes.push(match[1]);
  }
  return codes;
}

const DEFAULT_SCAM_KEYWORDS = [
  'free nitro',
  'nitro free',
  'nitro 無料',
  '無料 nitro',
  'discordnitro',
  'discord-nitro',
  'discrod',
  'dlscord',
  'steamcommunlty',
  'steamcommunity.ru',
  'free robux',
  'free-robux',
  'airdrop claim',
  '当選しました',
  '本日限定',
  'giveaway.gg',
];

export function containsScamPattern(content: string, extraKeywords: string[] = []): boolean {
  const lower = content.toLowerCase();
  return [...DEFAULT_SCAM_KEYWORDS, ...extraKeywords].some((keyword) => keyword && lower.includes(keyword.toLowerCase()));
}

export function calcCapsRatio(content: string): number {
  const letters = content.match(/[A-Za-z]/g) ?? [];
  if (letters.length === 0) return 0;
  const upperCount = letters.filter((c) => c === c.toUpperCase() && c !== c.toLowerCase()).length;
  return upperCount / letters.length;
}

const CUSTOM_EMOJI_REGEX = /<a?:\w+:\d+>/g;
const UNICODE_EMOJI_REGEX = /\p{Extended_Pictographic}/gu;

export function countEmojis(content: string): number {
  const customCount = content.match(CUSTOM_EMOJI_REGEX)?.length ?? 0;
  const withoutCustom = content.replace(CUSTOM_EMOJI_REGEX, '');
  const unicodeCount = withoutCustom.match(UNICODE_EMOJI_REGEX)?.length ?? 0;
  return customCount + unicodeCount;
}

// Zalgoテキストで使われる結合文字(ダイアクリティカルマーク)のコードポイント範囲
// (ソースファイルへの結合文字の直接埋め込みを避けるため数値範囲で判定する)
const COMBINING_MARK_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x0300, 0x036f], // Combining Diacritical Marks
  [0x1ab0, 0x1aff], // Combining Diacritical Marks Extended
  [0x1dc0, 0x1dff], // Combining Diacritical Marks Supplement
  [0x20d0, 0x20ff], // Combining Diacritical Marks for Symbols
];

function isCombiningMarkCodePoint(codePoint: number): boolean {
  return COMBINING_MARK_RANGES.some(([start, end]) => codePoint >= start && codePoint <= end);
}

export function isZalgo(content: string, maxMarksPerChar: number): boolean {
  let marks = 0;
  let baseChars = 0;
  for (const char of content) {
    const codePoint = char.codePointAt(0) ?? 0;
    if (isCombiningMarkCodePoint(codePoint)) {
      marks += 1;
    } else {
      baseChars += 1;
    }
  }
  if (baseChars === 0) return false;
  return marks / baseChars > maxMarksPerChar;
}

// 全角/半角統一・ゼロ幅文字除去・区切り記号除去を行い、「ｂ a‌d」「b.a.d」「b-a-d」のような
// フィルター回避目的の装飾をすり抜けにくくする。区切り文字を丸ごと除去するため、
// まれに複数単語をまたいで意図しない一致が起きうるが、NGワード検知の性質上は許容する
// ゼロ幅スペース/ゼロ幅非接合子/ゼロ幅接合子/BOMのコードポイント
// (ソースファイルへの不可視文字の直接埋め込みを避けるため数値で判定する)
const ZERO_WIDTH_CODEPOINTS = new Set([0x200b, 0x200c, 0x200d, 0xfeff]);

function stripZeroWidthChars(text: string): string {
  return [...text].filter((ch) => !ZERO_WIDTH_CODEPOINTS.has(ch.codePointAt(0) ?? -1)).join('');
}

function normalizeForMatching(text: string): string {
  return stripZeroWidthChars(text)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

export function matchesBannedWord(content: string, words: string[], normalize = false): string | null {
  if (words.length === 0) return null;
  const lower = content.toLowerCase();
  const normalizedContent = normalize ? normalizeForMatching(content) : null;

  for (const word of words) {
    if (!word) continue;
    if (lower.includes(word.toLowerCase())) return word;
    if (normalizedContent && normalizedContent.includes(normalizeForMatching(word))) return word;
  }
  return null;
}

export function matchesBannedRegex(content: string, pattern?: string): boolean {
  if (!pattern) return false;
  try {
    const regex = new RegExp(pattern, 'iu');
    return regex.test(content);
  } catch {
    console.warn('[automod] AUTOMOD_BANNED_WORDS_REGEX が不正な正規表現のため無視しました');
    return false;
  }
}

/** メッセージ中のURLからホスト名(www.は除く)を抽出する */
export function extractDomains(content: string): string[] {
  const domains: string[] = [];
  for (const match of content.matchAll(/https?:\/\/([^/\s]+)/gi)) {
    const host = match[1]?.toLowerCase().split(':')[0];
    if (host) domains.push(host.replace(/^www\./, ''));
  }
  return domains;
}

/** ドメイン(またはそのサブドメイン)が禁止リストに含まれていれば、一致した禁止ドメインを返す */
export function matchesBlockedDomain(domains: string[], blockedList: string[]): string | null {
  for (const domain of domains) {
    for (const blocked of blockedList) {
      if (!blocked) continue;
      const normalizedBlocked = blocked.toLowerCase().replace(/^www\./, '');
      if (domain === normalizedBlocked || domain.endsWith(`.${normalizedBlocked}`)) return blocked;
    }
  }
  return null;
}

/** 添付ファイル名の拡張子が禁止リストに含まれていれば、そのファイル名を返す */
export function findBlockedAttachment(fileNames: string[], blockedExtensions: string[]): string | null {
  if (blockedExtensions.length === 0) return null;
  const normalizedBlocked = blockedExtensions.map((ext) => ext.toLowerCase().replace(/^\./, ''));
  for (const name of fileNames) {
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext && normalizedBlocked.includes(ext)) return name;
  }
  return null;
}
