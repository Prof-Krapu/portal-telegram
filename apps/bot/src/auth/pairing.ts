import type { Context } from "grammy";
import type { BotConfig } from "@/config";
import type { PairedStore } from "@/state/store";
import { isAllowed } from "./allowlist";

/** Handle `/pair <token>`: enroll the sender if the token matches. */
export async function handlePair(
  ctx: Context,
  config: BotConfig,
  paired: PairedStore,
): Promise<void> {
  const userId = ctx.from?.id;
  if (userId === undefined) return;

  if (isAllowed(userId, config, paired)) {
    await ctx.reply("✅ This account is already authorized.");
    return;
  }

  const token = ctx.match?.toString().trim();
  if (!token) {
    await ctx.reply("Usage: /pair <token>");
    return;
  }

  if (token !== config.pairToken) {
    await ctx.reply("❌ Invalid pairing token.");
    return;
  }

  paired.add(userId);
  await ctx.reply(
    `✅ Account paired. Your Telegram ID ${userId} is now authorized. Send /help to get started.`,
  );
}
