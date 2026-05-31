import { loadConfig } from "@/config";
import { startBot } from "@/bot";

/**
 * Standalone entry point (`bun run bot`). Reads config from the environment and
 * starts the bot. The `opentelegram` CLI uses `startBot` directly instead.
 */
async function main(): Promise<void> {
  const config = loadConfig();

  console.log(`[bot] OpenCode server: ${config.opencodeBaseUrl}`);
  if (config.pairTokenGenerated) {
    console.log(`[bot] Pairing token (use /pair <token>): ${config.pairToken}`);
  }
  console.log("[bot] Starting long-polling…");

  const handle = await startBot(config);
  console.log(`[bot] @${handle.username} is running.`);
}

main().catch((error) => {
  console.error("[bot] fatal:", error);
  process.exit(1);
});
