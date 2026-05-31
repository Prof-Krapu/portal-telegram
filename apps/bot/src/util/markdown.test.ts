import { expect, test } from "bun:test";
import {
  escapeMarkdownV2,
  splitMessage,
  codeBlock,
  TELEGRAM_MAX_MESSAGE,
} from "./markdown";

test("escapeMarkdownV2 escapes all special characters", () => {
  expect(escapeMarkdownV2("a_b*c[d]")).toBe("a\\_b\\*c\\[d\\]");
  expect(escapeMarkdownV2("1.2-3!")).toBe("1\\.2\\-3\\!");
});

test("splitMessage returns single chunk when under limit", () => {
  expect(splitMessage("hello")).toEqual(["hello"]);
});

test("splitMessage breaks on newlines and never exceeds the limit", () => {
  const line = "x".repeat(1000);
  const text = Array.from({ length: 10 }, () => line).join("\n");
  const chunks = splitMessage(text);
  expect(chunks.length).toBeGreaterThan(1);
  for (const chunk of chunks) {
    expect(chunk.length).toBeLessThanOrEqual(TELEGRAM_MAX_MESSAGE);
  }
  // Rejoining (with the stripped newlines) preserves content length-wise.
  expect(chunks.join("").replace(/\n/g, "").length).toBe(
    text.replace(/\n/g, "").length,
  );
});

test("splitMessage hard-cuts a single oversized line", () => {
  const text = "y".repeat(TELEGRAM_MAX_MESSAGE * 2 + 5);
  const chunks = splitMessage(text);
  for (const chunk of chunks) {
    expect(chunk.length).toBeLessThanOrEqual(TELEGRAM_MAX_MESSAGE);
  }
});

test("codeBlock escapes backticks and backslashes", () => {
  expect(codeBlock("a`b\\c", "diff")).toBe("```diff\na\\`b\\\\c\n```");
});
