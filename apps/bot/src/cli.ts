#!/usr/bin/env bun
import { basename } from "path";
import { buildConfig } from "@/config";
import { startBot } from "@/bot";
import { startOpencodeServer } from "@/opencode/server";
import { runWizard } from "@/setup/wizard";
import {
  configExists,
  readStoredConfig,
  CONFIG_PATH,
  type StoredConfig,
} from "@/setup/config-store";
import { acquireInstanceLock, lockHolderPid } from "@/setup/lock";

const HELP = `opentelegram — drive OpenCode from Telegram, in the current folder

Usage:
  opentelegram                 Start the bot for the current workspace
  opentelegram config          Show the saved configuration
  opentelegram --reconfigure   Re-run the setup wizard
  opentelegram stop            Clear a stale single-instance lock
  opentelegram --help          Show this help

On first run, an interactive wizard guides you through connecting your
Telegram bot. After that, just run \`opentelegram\` inside any project.`;

async function main(): Promise<void> {
  const arg = process.argv[2];

  if (arg === "--help" || arg === "-h") {
    console.log(HELP);
    return;
  }

  if (arg === "config") {
    showConfig();
    return;
  }

  if (arg === "stop") {
    stopStaleLock();
    return;
  }

  if (arg === "--reconfigure") {
    await runWizard();
    return;
  }

  await run();
}

async function run(): Promise<void> {
  // 1. Load config or launch the first-run wizard.
  let stored: StoredConfig | null = configExists() ? readStoredConfig() : null;
  if (!stored) {
    if (!process.stdin.isTTY) {
      console.error(
        "No configuration found and no interactive terminal. Run `opentelegram --reconfigure` in a terminal.",
      );
      process.exit(1);
    }
    stored = await runWizard();
  }

  // 2. Enforce a single running instance (Telegram long-polling constraint).
  const release = acquireInstanceLock();
  if (!release) {
    const pid = lockHolderPid();
    console.error(
      `❌ opentelegram is already running${pid ? ` (pid ${pid})` : ""}.`,
    );
    console.error(
      "   Telegram allows only one instance per bot. Stop the other one first,",
    );
    console.error("   or run `opentelegram stop` if it crashed.");
    process.exit(1);
  }

  const workspace = process.cwd();
  let serverHandle: Awaited<ReturnType<typeof startOpencodeServer>> | null =
    null;
  let botHandle: Awaited<ReturnType<typeof startBot>> | null = null;

  const shutdown = async (code = 0) => {
    console.log("\n[opentelegram] Shutting down…");
    try {
      await botHandle?.stop();
    } catch {
      // ignore
    }
    serverHandle?.close();
    release();
    process.exit(code);
  };

  process.once("SIGINT", () => void shutdown(0));
  process.once("SIGTERM", () => void shutdown(0));

  try {
    // 3. Start an OpenCode server bound to the current workspace.
    console.log(`[opentelegram] Workspace: ${workspace}`);
    console.log("[opentelegram] Starting OpenCode server…");
    serverHandle = await startOpencodeServer();
    console.log(`[opentelegram] OpenCode: ${serverHandle.url}`);

    // 4. Start the bot against that server.
    const config = buildConfig({
      botToken: stored.botToken,
      allowedIds: stored.allowedIds,
      pairToken: stored.pairToken,
      opencodeBaseUrl: serverHandle.url,
      directory: workspace,
    });

    botHandle = await startBot(config);
    console.log(
      `\n✅ @${botHandle.username} is live for ${basename(workspace)}`,
    );
    if (stored.allowedIds.length === 0) {
      console.log(
        `   Pair your account in Telegram: /pair ${stored.pairToken}`,
      );
    }
    console.log("   Press Ctrl-C to stop.\n");
  } catch (error) {
    console.error(
      `[opentelegram] Failed to start: ${error instanceof Error ? error.message : error}`,
    );
    await shutdown(1);
  }
}

function showConfig(): void {
  const stored = readStoredConfig();
  if (!stored) {
    console.log("No configuration yet. Run `opentelegram` to set it up.");
    return;
  }
  console.log(`Config file: ${CONFIG_PATH}`);
  console.log(`Bot token:   ${maskToken(stored.botToken)}`);
  console.log(
    `Allowed IDs: ${stored.allowedIds.join(", ") || "(none — pair via /pair)"}`,
  );
  console.log(`Pair token:  ${stored.pairToken}`);
}

function stopStaleLock(): void {
  const pid = lockHolderPid();
  if (pid === null) {
    console.log("No instance lock found.");
    return;
  }
  try {
    process.kill(pid, 0);
    console.log(
      `An instance appears to be running (pid ${pid}). Stop it with Ctrl-C in its terminal.`,
    );
  } catch {
    // Holder is dead; acquireInstanceLock reclaims stale locks, so just inform.
    console.log("Stale lock will be reclaimed on next start.");
  }
}

function maskToken(token: string): string {
  const [id] = token.split(":");
  return `${id}:••••••••`;
}

main().catch((error) => {
  console.error("[opentelegram] fatal:", error);
  process.exit(1);
});
