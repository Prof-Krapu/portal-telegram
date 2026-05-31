import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { randomBytes } from "crypto";
import { Bot } from "grammy";
import { writeStoredConfig, type StoredConfig } from "./config-store";

/**
 * Interactive first-run setup. Walks the user through creating a Telegram bot,
 * validates the token against Telegram, captures the allowed Telegram IDs, and
 * persists the config. Returns the stored config.
 */
export async function runWizard(): Promise<StoredConfig> {
  const rl = createInterface({ input: stdin, output: stdout });

  try {
    console.log("");
    console.log("  ┌─────────────────────────────────────────────┐");
    console.log("  │        opentelegram — first-time setup        │");
    console.log("  └─────────────────────────────────────────────┘");
    console.log("");
    console.log("  Let's connect your Telegram bot. This runs once.");
    console.log("");

    const botToken = await promptBotToken(rl);
    const me = await validateToken(botToken);
    console.log(`  ✅ Connected to @${me.username}\n`);

    const allowedIds = await promptAllowedIds(rl);
    const pairToken = randomBytes(12).toString("hex");

    const config: StoredConfig = { botToken, allowedIds, pairToken };
    writeStoredConfig(config);

    console.log("");
    console.log(
      "  ✅ Setup complete. Config saved to ~/.opentelegram/config.json",
    );
    if (allowedIds.length === 0) {
      console.log("");
      console.log(
        "  ⚠️  No Telegram IDs were added. On first launch, open a chat",
      );
      console.log(`     with @${me.username} and send:  /pair ${pairToken}`);
    }
    console.log("");

    return config;
  } finally {
    rl.close();
  }
}

async function promptBotToken(
  rl: ReturnType<typeof createInterface>,
): Promise<string> {
  console.log("  Step 1 — Create a bot");
  console.log("    1. Open Telegram and message @BotFather");
  console.log("    2. Send /newbot and follow the prompts");
  console.log(
    "    3. Copy the token it gives you (looks like 123456:ABC-DEF…)",
  );
  console.log("");

  for (;;) {
    const token = (await rl.question("  Paste your bot token: ")).trim();
    if (/^\d+:[\w-]{30,}$/.test(token)) return token;
    console.log("  ❌ That doesn't look like a valid token. Try again.\n");
  }
}

async function validateToken(token: string): Promise<{ username: string }> {
  try {
    const bot = new Bot(token);
    const me = await bot.api.getMe();
    return { username: me.username };
  } catch {
    console.log("");
    console.log(
      "  ❌ Telegram rejected that token. Double-check it and re-run",
    );
    console.log("     `opentelegram --reconfigure`.");
    process.exit(1);
  }
}

async function promptAllowedIds(
  rl: ReturnType<typeof createInterface>,
): Promise<number[]> {
  console.log("  Step 2 — Authorize yourself");
  console.log("    Your Telegram numeric ID controls who can use the bot.");
  console.log(
    "    Get it by messaging @userinfobot (it replies with your ID).",
  );
  console.log("    Leave blank to skip and pair later via /pair.");
  console.log("");

  const answer = (
    await rl.question("  Your Telegram ID(s), comma-separated: ")
  ).trim();
  if (!answer) return [];

  return answer
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((id) => Number.isInteger(id));
}
