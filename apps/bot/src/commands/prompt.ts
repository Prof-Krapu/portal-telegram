import type { Context } from "grammy";
import { randomUUID } from "crypto";
import type { OpencodeClient } from "@/opencode/client";
import type { TurnManager } from "@/interaction/stream";
import { getChatState } from "@/state/chat-state";

/**
 * Handle a plain text message: send it as a prompt to the active session and
 * open a streaming reply. Uses promptAsync so streaming happens over events.
 */
export async function handlePrompt(
  ctx: Context,
  client: OpencodeClient,
  turns: TurnManager,
): Promise<void> {
  const chatId = ctx.chat?.id;
  const text = ctx.message?.text;
  if (chatId === undefined || !text) return;

  const state = getChatState(chatId);
  if (!state.sessionID) {
    await ctx.reply("No active session. Use /new to start one.");
    return;
  }

  if (turns.hasActiveTurn(state.sessionID)) {
    await ctx.reply(
      "⏳ A turn is already running. Use ✖ Annuler or /abort first.",
    );
    return;
  }

  // Open the streaming message before firing the prompt, so the first deltas
  // already have a message to edit.
  await turns.beginTurn(chatId, state.sessionID);

  try {
    await client.session.promptAsync({
      sessionID: state.sessionID,
      messageID: randomUUID(),
      parts: [{ type: "text", text }],
      ...(state.model
        ? {
            model: {
              providerID: state.model.providerID,
              modelID: state.model.modelID,
            },
          }
        : {}),
      ...(state.variant ? { variant: state.variant } : {}),
      ...(state.agent ? { agent: state.agent } : {}),
    });
  } catch (error) {
    await turns.abort(state.sessionID);
    await ctx.reply(
      `❌ ${error instanceof Error ? error.message : "Failed to send prompt"}`,
    );
  }
}
