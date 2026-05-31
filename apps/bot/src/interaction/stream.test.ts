import { expect, test } from "bun:test";
import { TurnManager } from "./stream";

test("cancel callback data round-trips", () => {
  const data = TurnManager.cancelData("sess_123");
  expect(TurnManager.parseCancelData(data)).toBe("sess_123");
});

test("parseCancelData returns null for unrelated data", () => {
  expect(TurnManager.parseCancelData("perm:once:x")).toBeNull();
});
