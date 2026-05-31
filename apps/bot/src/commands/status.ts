import type { Context } from "grammy";
import type { OpencodeClient } from "@/opencode/client";
import type { BotConfig } from "@/config";
import { getChatState } from "@/state/chat-state";
import { escapeMarkdownV2 } from "@/util/markdown";

/** /status — show the active session, model, agent and server connection. */
export async function cmdStatus(
  ctx: Context,
  config: BotConfig,
  client: OpencodeClient,
): Promise<void> {
  const chatId = ctx.chat?.id;
  if (chatId === undefined) return;

  const state = getChatState(chatId);
  let project = "unknown";
  try {
    const current = await client.project.current();
    project = current.data?.worktree ?? "unknown";
  } catch {
    project = "unreachable";
  }

  const lines = [
    `*Status*`,
    `Server: \`${escapeMarkdownV2(config.opencodeBaseUrl)}\``,
    `Project: \`${escapeMarkdownV2(project)}\``,
    `Session: \`${escapeMarkdownV2(state.sessionID ?? "none")}\``,
    `Model: \`${escapeMarkdownV2(state.model ? `${state.model.providerID}/${state.model.modelID}` : "default")}\``,
    `Agent: \`${escapeMarkdownV2(state.agent ?? "default")}\``,
  ];

  await ctx.reply(lines.join("\n"), { parse_mode: "MarkdownV2" });
}

/** /health — quick reachability check against the OpenCode server. */
export async function cmdHealth(
  ctx: Context,
  client: OpencodeClient,
): Promise<void> {
  try {
    await client.config.get();
    await ctx.reply("✅ OpenCode server reachable.");
  } catch (error) {
    await ctx.reply(
      `❌ Server unreachable: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
}
