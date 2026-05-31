import type { Context } from "grammy";

const HELP = `*OpenCode Telegram Bot*

Send any text message to prompt the active session.

*Sessions*
/new — create a new session
/sessions — list sessions
/session <id> — switch active session
/end — delete the active session
/abort — stop the running turn (or tap ✖ Annuler)

*Configuration*
/model — choose the model for this session
/agent — choose the agent for this session

*Inspection*
/diff — show uncommitted git changes
/status — active session, model, server
/health — check the OpenCode server

*Access*
/pair <token> — enroll this account

Mention files with @path in your prompt\\.`;

export async function cmdHelp(ctx: Context): Promise<void> {
  await ctx.reply(HELP, { parse_mode: "MarkdownV2" });
}
