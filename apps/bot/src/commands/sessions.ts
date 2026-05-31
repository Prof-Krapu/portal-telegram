import type { Context } from "grammy";
import type { OpencodeClient } from "@/opencode/client";
import type { TurnManager } from "@/interaction/stream";
import { getChatState, setChatState } from "@/state/chat-state";
import { escapeMarkdownV2 } from "@/util/markdown";

/** /new — create a fresh session and make it active for this chat. */
export async function cmdNew(
  ctx: Context,
  client: OpencodeClient,
): Promise<void> {
  const chatId = ctx.chat?.id;
  if (chatId === undefined) return;

  const result = await client.session.create({});
  const session = result.data;
  if (!session) {
    await ctx.reply("❌ Failed to create session.");
    return;
  }

  setChatState(chatId, { sessionID: session.id });
  await ctx.reply(
    `🆕 New session \`${escapeMarkdownV2(session.id)}\`\\. Send a message to start, or pick a model with /model\\.`,
    { parse_mode: "MarkdownV2" },
  );
}

/** /sessions — list recent sessions. */
export async function cmdSessions(
  ctx: Context,
  client: OpencodeClient,
): Promise<void> {
  const result = await client.session.list();
  const sessions = (result.data ?? []).slice(0, 20);
  if (sessions.length === 0) {
    await ctx.reply("No sessions yet. Use /new to create one.");
    return;
  }

  const active = ctx.chat ? getChatState(ctx.chat.id).sessionID : undefined;
  const lines = sessions.map((s) => {
    const marker = s.id === active ? "▶️" : "•";
    const title = s.title || "(untitled)";
    return `${marker} \`${escapeMarkdownV2(s.id)}\` — ${escapeMarkdownV2(title)}`;
  });

  await ctx.reply(
    `*Sessions*\n${lines.join("\n")}\n\nSwitch with /session <id>\\.`,
    { parse_mode: "MarkdownV2" },
  );
}

/** /session <id> — switch the active session. */
export async function cmdSession(
  ctx: Context,
  client: OpencodeClient,
): Promise<void> {
  const chatId = ctx.chat?.id;
  if (chatId === undefined) return;

  const id = ctx.match?.toString().trim();
  if (!id) {
    await ctx.reply("Usage: /session <id>");
    return;
  }

  const result = await client.session.list();
  const exists = (result.data ?? []).some((s) => s.id === id);
  if (!exists) {
    await ctx.reply("❌ No session with that id. Use /sessions to list them.");
    return;
  }

  setChatState(chatId, { sessionID: id });
  await ctx.reply(`▶️ Active session: \`${escapeMarkdownV2(id)}\``, {
    parse_mode: "MarkdownV2",
  });
}

/** /end — delete the active session. */
export async function cmdEnd(
  ctx: Context,
  client: OpencodeClient,
): Promise<void> {
  const chatId = ctx.chat?.id;
  if (chatId === undefined) return;

  const state = getChatState(chatId);
  if (!state.sessionID) {
    await ctx.reply("No active session.");
    return;
  }

  await client.session.delete({ sessionID: state.sessionID });
  setChatState(chatId, { sessionID: undefined });
  await ctx.reply("🗑️ Session deleted.");
}

/** /abort — stop the current turn (same as the ✖ Annuler button). */
export async function cmdAbort(
  ctx: Context,
  turns: TurnManager,
): Promise<void> {
  const chatId = ctx.chat?.id;
  if (chatId === undefined) return;

  const state = getChatState(chatId);
  if (!state.sessionID || !turns.hasActiveTurn(state.sessionID)) {
    await ctx.reply("Nothing running to abort.");
    return;
  }

  await turns.abort(state.sessionID);
}
