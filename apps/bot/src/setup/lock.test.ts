import { expect, test, afterEach } from "bun:test";
import { existsSync, rmSync } from "fs";
import { acquireInstanceLock, lockHolderPid } from "./lock";
import { LOCK_PATH } from "./config-store";

afterEach(() => {
  if (existsSync(LOCK_PATH)) rmSync(LOCK_PATH);
});

test("acquires a lock and records the current pid", () => {
  const release = acquireInstanceLock();
  expect(release).not.toBeNull();
  expect(lockHolderPid()).toBe(process.pid);
  release?.();
  expect(existsSync(LOCK_PATH)).toBe(false);
});

test("reclaims a stale lock left by a dead process", () => {
  // Write a lock owned by an almost-certainly-dead pid.
  const first = acquireInstanceLock();
  first?.(); // release to clean slate
  // Manually plant a stale lock.
  Bun.write(LOCK_PATH, "999999");
  const release = acquireInstanceLock();
  expect(release).not.toBeNull();
  release?.();
});

test("refuses a second lock held by a live process", () => {
  const release = acquireInstanceLock();
  // The current process is alive and holds the lock, so a second attempt fails.
  const second = acquireInstanceLock();
  expect(second).toBeNull();
  release?.();
});
