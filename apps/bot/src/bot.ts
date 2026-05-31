import { Bot } from "grammy";
import type { BotConfig } from "@/config";
import { createClient } from "@/opencode/client";
import { EventBus } from "@/opencode/events";
import { PairedStore } from "@/state/store";
import { allowlistMiddleware } from "@/auth/allowlist";
import { handlePair } from "@/auth/pairing";
import { TurnManager } from "@/interaction/stream";
import {
  pushPermission,
  handlePermissionReply,
  PERMISSION_PREFIX,
} from "@/interaction/permissions";
import { handlePrompt } from "@/commands/prompt";
import {
  cmdNew,
  cmdSessions,
  cmdSession,
  cmdEnd,
  cmdAbort,
} from "@/commands/sessions";
import { cmdModel, handleModelPick, MODEL_PICK_PREFIX } from "@/commands/model";
import { cmdAgent, handleAgentPick, AGENT_PICK_PREFIX } from "@/commands/agent";
import { cmdDiff } from "@/commands/diff";
import { cmdStatus, cmdHealth } from "@/commands/status";
import { cmdHelp } from "@/commands/help";

export interface BotHandle {
  /** The bot's @username, available after start. */
  username: string;
  /** Stop polling and the event stream. */
  stop: () => Promise<void>;
}

/**
 * Wire up and start the Telegram bot for a given config. Resolves once the bot
 * is running (long-polling started). Returns a handle for graceful shutdown.
 */
export async function startBot(config: BotConfig): Promise<BotHandle> {
  const paired = new PairedStore();
  const client = createClient(config);

  const bot = new Bot(config.botToken);
  const turns = new TurnManager(bot.api, client);

  // Fan OpenCode events out to chats: streaming turns + permission prompts.
  const events = new EventBus(client);
  events.on((event) => turns.handleEvent(event));
  events.on(async (event) => {
    if (event.type === "permission.asked") {
      await pushPermission(bot.api, event);
    }
  });
  events.start();

  // --- Auth gate (everything except /pair requires allowlist) ---
  bot.use(allowlistMiddleware(config, paired));

  // --- Commands ---
  bot.command(["start", "help"], cmdHelp);
  bot.command("pair", (ctx) => handlePair(ctx, config, paired));
  bot.command("new", (ctx) => cmdNew(ctx, client));
  bot.command("sessions", (ctx) => cmdSessions(ctx, client));
  bot.command("session", (ctx) => cmdSession(ctx, client));
  bot.command("end", (ctx) => cmdEnd(ctx, client));
  bot.command("abort", (ctx) => cmdAbort(ctx, turns));
  bot.command("model", (ctx) => cmdModel(ctx, client));
  bot.command("agent", (ctx) => cmdAgent(ctx, client));
  bot.command("diff", (ctx) => cmdDiff(ctx, client));
  bot.command("status", (ctx) => cmdStatus(ctx, config, client));
  bot.command("health", (ctx) => cmdHealth(ctx, client));

  // --- Callback queries (inline keyboards) ---
  bot.on("callback_query:data", async (ctx) => {
    const data = ctx.callbackQuery.data;
    const cancelSession = TurnManager.parseCancelData(data);
    if (cancelSession) {
      await turns.abort(cancelSession);
      await ctx.answerCallbackQuery("Annulé.");
      return;
    }
    if (data.startsWith(PERMISSION_PREFIX)) {
      await handlePermissionReply(ctx, client);
      return;
    }
    if (data.startsWith(MODEL_PICK_PREFIX)) {
      await handleModelPick(ctx);
      return;
    }
    if (data.startsWith(AGENT_PICK_PREFIX)) {
      await handleAgentPick(ctx);
      return;
    }
    await ctx.answerCallbackQuery();
  });

  // --- Plain text → prompt the active session ---
  bot.on("message:text", async (ctx) => {
    if (ctx.message.text.startsWith("/")) return; // unknown command, ignore
    await handlePrompt(ctx, client, turns);
  });

  bot.catch((err) => {
    console.error("[bot] error:", err.error);
  });

  await bot.api.setMyCommands([
    { command: "new", description: "Create a new session" },
    { command: "sessions", description: "List sessions" },
    { command: "session", description: "Switch active session" },
    { command: "end", description: "Delete the active session" },
    { command: "abort", description: "Stop the running turn" },
    { command: "model", description: "Choose the model" },
    { command: "agent", description: "Choose the agent" },
    { command: "diff", description: "Show git diff" },
    { command: "status", description: "Show status" },
    { command: "health", description: "Check the server" },
    { command: "help", description: "Show help" },
  ]);

  // Start polling in the background; resolve once grammY reports the bot info.
  const username = await new Promise<string>((resolve, reject) => {
    bot
      .start({
        onStart: (me) => resolve(me.username),
      })
      .catch(reject);
  });

  return {
    username,
    stop: async () => {
      events.stop();
      await bot.stop();
    },
  };
}
