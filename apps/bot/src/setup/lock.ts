import { closeSync, openSync, readFileSync, unlinkSync, writeSync } from "fs";
import { ensureDir, LOCK_PATH } from "./config-store";

/**
 * Acquire the single-instance lock. Telegram long-polling only allows one
 * active poller per bot token, so only one `opentelegram` may run at a time.
 *
 * Returns a release function on success, or null if another live instance
 * already holds the lock. A stale lock left by a dead process is reclaimed.
 */
export function acquireInstanceLock(): (() => void) | null {
  ensureDir();

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const fd = openSync(LOCK_PATH, "wx");
      writeSync(fd, String(process.pid));
      closeSync(fd);
      return () => {
        try {
          unlinkSync(LOCK_PATH);
        } catch {
          // Already removed; nothing to do.
        }
      };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
      if (!reclaimIfStale()) return null;
      // Stale lock removed — loop once more to acquire it.
    }
  }
  return null;
}

/** The PID currently holding the lock, or null if none/unreadable. */
export function lockHolderPid(): number | null {
  try {
    const pid = parseInt(readFileSync(LOCK_PATH, "utf-8"), 10);
    return Number.isFinite(pid) ? pid : null;
  } catch {
    return null;
  }
}

/** Remove the lock if its holder process is no longer running. */
function reclaimIfStale(): boolean {
  const pid = lockHolderPid();
  if (pid === null) {
    // Unreadable/empty lock — treat as stale.
    tryUnlink();
    return true;
  }
  if (isProcessRunning(pid)) return false;
  tryUnlink();
  return true;
}

function tryUnlink(): void {
  try {
    unlinkSync(LOCK_PATH);
  } catch {
    // Someone else cleaned it up; fine.
  }
}

function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
