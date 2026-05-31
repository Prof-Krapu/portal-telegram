import type { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import type { OpencodeClient } from "@/opencode/client";
import { setChatState } from "@/state/chat-state";
import { escapeMarkdownV2 } from "@/util/markdown";

const PICK_PREFIX = "model:";

/**
 * /model — show an inline keyboard of provider/model choices. The selection is
 * stored per-chat (per active session) and passed on each prompt, mirroring the
 * opencode CLI's per-session model selection.
 */
export async function cmdModel(
  ctx: Context,
  client: OpencodeClient,
): Promise<void> {
  const result = await client.config.providers();
  const providers = result.data?.providers ?? [];
  if (providers.length === 0) {
    await ctx.reply("No providers configured on the OpenCode server.");
    return;
  }

  const keyboard = new InlineKeyboard();
  for (const provider of providers) {
    const models = Object.values(provider.models);
    for (const model of models) {
      keyboard
        .text(
          `${provider.name} · ${model.name}`,
          `${PICK_PREFIX}${provider.id}:${model.id}`,
        )
        .row();
    }
  }

  await ctx.reply("Choose a model for this session:", {
    reply_markup: keyboard,
  });
}

/** Handle a model:* callback query. */
export async function handleModelPick(ctx: Context): Promise<void> {
  const chatId = ctx.chat?.id;
  const data = ctx.callbackQuery?.data;
  if (chatId === undefined || !data?.startsWith(PICK_PREFIX)) return;

  const [providerID, modelID] = data.slice(PICK_PREFIX.length).split(":");
  if (!providerID || !modelID) {
    await ctx.answerCallbackQuery("Invalid selection.");
    return;
  }

  setChatState(chatId, { model: { providerID, modelID } });
  await ctx.answerCallbackQuery(`Model set: ${modelID}`);
  await ctx.editMessageText(
    `✅ Model set to \`${escapeMarkdownV2(`${providerID}/${modelID}`)}\` for this session\\.`,
    { parse_mode: "MarkdownV2" },
  );
}

export const MODEL_PICK_PREFIX = PICK_PREFIX;
