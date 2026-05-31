import { existsSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const STORE_PATH = join(homedir(), ".portal-bot.json");

interface PersistedState {
  /** Telegram user IDs enrolled via /pair (in addition to env allowlist). */
  pairedIds: number[];
}

function readStore(): PersistedState {
  try {
    if (existsSync(STORE_PATH)) {
      const data = JSON.parse(readFileSync(STORE_PATH, "utf-8"));
      return {
        pairedIds: Array.isArray(data.pairedIds) ? data.pairedIds : [],
      };
    }
  } catch {
    // Corrupt or unreadable file — start fresh rather than crash.
  }
  return { pairedIds: [] };
}

function writeStore(state: PersistedState): void {
  writeFileSync(STORE_PATH, JSON.stringify(state, null, 2));
}

/** Persisted set of paired Telegram user IDs. */
export class PairedStore {
  private ids: Set<number>;

  constructor() {
    this.ids = new Set(readStore().pairedIds);
  }

  has(id: number): boolean {
    return this.ids.has(id);
  }

  add(id: number): void {
    if (this.ids.has(id)) return;
    this.ids.add(id);
    writeStore({ pairedIds: [...this.ids] });
  }
}
