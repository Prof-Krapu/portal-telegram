import type { Context, NextFunction } from "grammy";
import type { BotConfig } from "@/config";
import type { PairedStore } from "@/state/store";

/**
 * Returns true if the user is allowed (env allowlist or previously paired).
 * The /pair command is exempt so unknown users can enroll themselves.
 */
export function isAllowed(
  userId: number | undefined,
  config: BotConfig,
  paired: PairedStore,
): boolean {
  if (userId === undefined) return false;
  return config.allowedIds.has(userId) || paired.has(userId);
}

/**
 * grammY middleware that blocks any update from a non-allowlisted user.
 * The /pair command passes through so new users can authenticate.
 */
export function allowlistMiddleware(config: BotConfig, paired: PairedStore) {
  return async (ctx: Context, next: NextFunction): Promise<void> => {
    const text = ctx.message?.text ?? "";
    if (text.startsWith("/pair")) {
      await next();
      return;
    }

    if (isAllowed(ctx.from?.id, config, paired)) {
      await next();
      return;
    }

    // Only reply to direct messages/commands; ignore silent updates.
    if (ctx.chat) {
      await ctx.reply(
        "⛔ You are not authorized. Use /pair <token> to enroll this account.",
      );
    }
  };
}
