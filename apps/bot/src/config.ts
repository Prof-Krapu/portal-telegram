import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { randomBytes } from "crypto";
import { z } from "zod";

const PORTAL_CONFIG_PATH = join(homedir(), ".portal.json");

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1, "TELEGRAM_BOT_TOKEN is required"),
  TELEGRAM_ALLOWED_IDS: z.string().optional().default(""),
  PAIR_TOKEN: z.string().optional().default(""),
  OPENCODE_URL: z.string().optional().default(""),
  OPENCODE_PORT: z.string().optional().default(""),
  OPENCODE_DIRECTORY: z.string().optional().default(""),
});

export interface BotConfig {
  botToken: string;
  /** Telegram user IDs that bypass pairing. */
  allowedIds: Set<number>;
  /** Token accepted by /pair to enroll a new user. */
  pairToken: string;
  /** Whether the pair token was generated (so we print it at boot). */
  pairTokenGenerated: boolean;
  /** Base URL of the OpenCode server, e.g. http://localhost:4000 */
  opencodeBaseUrl: string;
  /** Optional working directory passed to the OpenCode client. */
  directory: string | undefined;
}

function parseIds(raw: string): Set<number> {
  const ids = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => Number(part))
    .filter((id) => Number.isInteger(id));
  return new Set(ids);
}

/**
 * Resolve the OpenCode server base URL. Priority:
 *   1. OPENCODE_URL (full base URL)
 *   2. OPENCODE_PORT (host defaults to localhost)
 *   3. first running "opencode" instance in ~/.portal.json
 *   4. http://localhost:4000 fallback
 */
function resolveOpencodeBaseUrl(url: string, port: string): string {
  if (url) return url.replace(/\/$/, "");
  if (port) return `http://localhost:${Number(port)}`;

  const fromConfig = readBaseUrlFromPortalConfig();
  if (fromConfig) return fromConfig;

  return "http://localhost:4000";
}

function readBaseUrlFromPortalConfig(): string | null {
  try {
    if (!existsSync(PORTAL_CONFIG_PATH)) return null;
    const config = JSON.parse(readFileSync(PORTAL_CONFIG_PATH, "utf-8"));
    const instances: Array<{
      provider?: string;
      hostname?: string;
      port?: number | null;
      backendPort?: number;
      opencodePort?: number;
    }> = Array.isArray(config.instances) ? config.instances : [];

    const opencode = instances.find(
      (instance) => (instance.provider ?? "opencode") === "opencode",
    );
    if (!opencode) return null;

    const port = opencode.backendPort ?? opencode.opencodePort;
    if (!port) return null;

    const host =
      opencode.hostname && opencode.hostname !== "0.0.0.0"
        ? opencode.hostname
        : "localhost";
    return `http://${host}:${port}`;
  } catch {
    return null;
  }
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): BotConfig {
  const parsed = envSchema.parse(env);

  const pairTokenGenerated = !parsed.PAIR_TOKEN;
  const pairToken = parsed.PAIR_TOKEN || randomBytes(12).toString("hex");

  return {
    botToken: parsed.TELEGRAM_BOT_TOKEN,
    allowedIds: parseIds(parsed.TELEGRAM_ALLOWED_IDS),
    pairToken,
    pairTokenGenerated,
    opencodeBaseUrl: resolveOpencodeBaseUrl(
      parsed.OPENCODE_URL,
      parsed.OPENCODE_PORT,
    ),
    directory: parsed.OPENCODE_DIRECTORY || undefined,
  };
}
