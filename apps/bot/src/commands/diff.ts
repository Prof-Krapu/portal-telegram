import type { Context } from "grammy";
import { InputFile } from "grammy";
import { exec } from "child_process";
import { promisify } from "util";
import type { OpencodeClient } from "@/opencode/client";
import { codeBlock, TELEGRAM_MAX_MESSAGE } from "@/util/markdown";

const execAsync = promisify(exec);

/**
 * /diff — show the working-tree git diff for the project. Small diffs are sent
 * as a fenced code block; large ones are attached as a .diff document.
 */
export async function cmdDiff(
  ctx: Context,
  client: OpencodeClient,
): Promise<void> {
  const project = await client.project.current();
  const worktree = project.data?.worktree;
  if (!worktree) {
    await ctx.reply("No project worktree found.");
    return;
  }

  let diff: string;
  try {
    const { stdout } = await execAsync("git diff HEAD", {
      cwd: worktree,
      maxBuffer: 10 * 1024 * 1024,
    });
    diff = stdout;
  } catch (error) {
    const err = error as { stderr?: string; message?: string };
    await ctx.reply(`❌ ${err.stderr || err.message || "git diff failed"}`);
    return;
  }

  if (!diff.trim()) {
    await ctx.reply("No uncommitted changes.");
    return;
  }

  // Leave headroom for the code fence wrapper.
  if (diff.length < TELEGRAM_MAX_MESSAGE - 100) {
    await ctx.reply(codeBlock(diff, "diff"), { parse_mode: "MarkdownV2" });
    return;
  }

  await ctx.replyWithDocument(
    new InputFile(Buffer.from(diff, "utf-8"), "changes.diff"),
  );
}
