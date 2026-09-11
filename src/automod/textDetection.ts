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

export function matchesBannedWord(content: string, words: string[]): string | null {
  if (words.length === 0) return null;
  const lower = content.toLowerCase();
  for (const word of words) {
    if (word && lower.includes(word.toLowerCase())) return word;
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
