// Telegram message hard limit.
export const TELEGRAM_MAX_MESSAGE = 4096;

// Characters that must be escaped in Telegram MarkdownV2 (outside entities).
const MARKDOWNV2_SPECIAL = /[_*[\]()~`>#+\-=|{}.!\\]/g;

/** Escape arbitrary text for Telegram MarkdownV2. */
export function escapeMarkdownV2(text: string): string {
  return text.replace(MARKDOWNV2_SPECIAL, (match) => `\\${match}`);
}

/**
 * Wrap text in a MarkdownV2 fenced code block. Only the backslash and backtick
 * need escaping inside a code entity.
 */
export function codeBlock(text: string, language = ""): string {
  const escaped = text.replace(/\\/g, "\\\\").replace(/`/g, "\\`");
  return `\`\`\`${language}\n${escaped}\n\`\`\``;
}

/**
 * Split a long string into Telegram-sized chunks, preferring to break on
 * newlines so we don't cut words/lines in half. Never returns an empty array.
 */
export function splitMessage(
  text: string,
  limit = TELEGRAM_MAX_MESSAGE,
): string[] {
  if (text.length <= limit) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > limit) {
    let cut = remaining.lastIndexOf("\n", limit);
    // No newline in range — fall back to a hard cut at the limit.
    if (cut <= 0) cut = limit;
    chunks.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut).replace(/^\n/, "");
  }

  if (remaining.length > 0) chunks.push(remaining);
  return chunks;
}
