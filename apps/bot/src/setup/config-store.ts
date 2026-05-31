import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  chmodSync,
} from "fs";
import { homedir } from "os";
import { join } from "path";
import { z } from "zod";

/** Directory holding all opentelegram state. */
export const OPENTELEGRAM_DIR = join(homedir(), ".opentelegram");
export const CONFIG_PATH = join(OPENTELEGRAM_DIR, "config.json");
export const LOCK_PATH = join(OPENTELEGRAM_DIR, "instance.lock");

const storedConfigSchema = z.object({
  botToken: z.string().min(1),
  allowedIds: z.array(z.number()).default([]),
  pairToken: z.string().min(1),
});

export type StoredConfig = z.infer<typeof storedConfigSchema>;

export function configExists(): boolean {
  return existsSync(CONFIG_PATH);
}

export function readStoredConfig(): StoredConfig | null {
  try {
    if (!existsSync(CONFIG_PATH)) return null;
    const raw = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
    return storedConfigSchema.parse(raw);
  } catch {
    return null;
  }
}

/** Persist the config with owner-only permissions (it holds the bot token). */
export function writeStoredConfig(config: StoredConfig): void {
  ensureDir();
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  try {
    chmodSync(CONFIG_PATH, 0o600);
  } catch {
    // chmod may be unsupported (e.g. some filesystems); best effort only.
  }
}

export function ensureDir(): void {
  if (!existsSync(OPENTELEGRAM_DIR)) {
    mkdirSync(OPENTELEGRAM_DIR, { recursive: true, mode: 0o700 });
  }
}
