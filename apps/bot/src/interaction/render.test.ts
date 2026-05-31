import { expect, test } from "bun:test";
import { TurnRenderer } from "./render";

test("accumulates text deltas in order", () => {
  const r = new TurnRenderer();
  r.appendText("Hello ");
  r.appendText("world");
  expect(r.render({ finished: true })).toContain("Hello world");
});

test("shows a typing indicator while unfinished", () => {
  const r = new TurnRenderer();
  r.appendText("working");
  expect(r.render({ finished: false })).toContain("▌");
});

test("renders tool calls with a summarized input", () => {
  const r = new TurnRenderer();
  r.addTool("read", { filePath: "/tmp/foo.ts" });
  const out = r.render({ finished: true });
  expect(out).toContain("read");
  expect(out).toContain("foo");
});

test("renders token footer when finished", () => {
  const r = new TurnRenderer();
  r.appendText("done");
  const out = r.render({
    finished: true,
    tokens: { input: 10, output: 20, cost: 0.0012 },
  });
  expect(out).toContain("10");
  expect(out).toContain("20");
});
