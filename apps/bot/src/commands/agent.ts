import type { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import type { OpencodeClient } from "@/opencode/client";
import { setChatState } from "@/state/chat-state";
import { escapeMarkdownV2 } from "@/util/markdown";

const PICK_PREFIX = "agent:";

/** /agent — list available agents as an inline keyboard. */
export async function cmdAgent(
  ctx: Context,
  client: OpencodeClient,
): Promise<void> {
  const result = await client.app.agents();
  const agents = result.data ?? [];
  if (agents.length === 0) {
    await ctx.reply("No agents available.");
    return;
  }

  const keyboard = new InlineKeyboard();
  for (const agent of agents) {
    keyboard.text(agent.name, `${PICK_PREFIX}${agent.name}`).row();
  }

  await ctx.reply("Choose an agent for this session:", {
    reply_markup: keyboard,
  });
}

/** Handle an agent:* callback query. */
export async function handleAgentPick(ctx: Context): Promise<void> {
  const chatId = ctx.chat?.id;
  const data = ctx.callbackQuery?.data;
  if (chatId === undefined || !data?.startsWith(PICK_PREFIX)) return;

  const name = data.slice(PICK_PREFIX.length);
  if (!name) {
    await ctx.answerCallbackQuery("Invalid selection.");
    return;
  }

  setChatState(chatId, { agent: name });
  await ctx.answerCallbackQuery(`Agent set: ${name}`);
  await ctx.editMessageText(
    `✅ Agent set to \`${escapeMarkdownV2(name)}\` for this session\\.`,
    { parse_mode: "MarkdownV2" },
  );
}

export const AGENT_PICK_PREFIX = PICK_PREFIX;
