import type { Api, Context } from "grammy";
import { InlineKeyboard } from "grammy";
import type { OpencodeClient } from "@/opencode/client";
import type { Event, PermissionRequest } from "@/opencode/types";
import { findChatBySession } from "@/state/chat-state";
import { escapeMarkdownV2 } from "@/util/markdown";

const PREFIX = "perm:";

function keyboard(requestID: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("✅ Once", `${PREFIX}once:${requestID}`)
    .text("♾️ Always", `${PREFIX}always:${requestID}`)
    .text("⛔ Reject", `${PREFIX}reject:${requestID}`);
}

/**
 * Pushes a permission request to the owning chat as an inline keyboard.
 * Returns silently if no chat owns the session (e.g. started from elsewhere).
 */
export async function pushPermission(
  api: Api,
  event: Extract<Event, { type: "permission.asked" }>,
): Promise<void> {
  const request: PermissionRequest = event.properties;
  const chatId = findChatBySession(request.sessionID);
  if (chatId === undefined) return;

  const patterns = request.patterns.length
    ? `\n${escapeMarkdownV2(request.patterns.join(", "))}`
    : "";

  await api.sendMessage(
    chatId,
    `🔐 Permission requested: \`${escapeMarkdownV2(request.permission)}\`${patterns}`,
    { parse_mode: "MarkdownV2", reply_markup: keyboard(request.id) },
  );
}

/** Handle a perm:* callback query. */
export async function handlePermissionReply(
  ctx: Context,
  client: OpencodeClient,
): Promise<void> {
  const data = ctx.callbackQuery?.data;
  if (!data?.startsWith(PREFIX)) return;

  const rest = data.slice(PREFIX.length);
  const idx = rest.indexOf(":");
  const reply = rest.slice(0, idx) as "once" | "always" | "reject";
  const requestID = rest.slice(idx + 1);

  try {
    await client.permission.reply({ requestID, reply });
    await ctx.answerCallbackQuery(`Permission ${reply}.`);
    await ctx.editMessageReplyMarkup({});
  } catch (error) {
    await ctx.answerCallbackQuery(
      error instanceof Error ? error.message : "Failed to reply.",
    );
  }
}

export const PERMISSION_PREFIX = PREFIX;
