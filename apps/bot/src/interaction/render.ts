import { escapeMarkdownV2 } from "@/util/markdown";

/**
 * Accumulates the streamed output of a single assistant turn and renders it to
 * a MarkdownV2 string suitable for editing into one Telegram message.
 *
 * The OpenCode SDK streams a turn as ordered deltas:
 *   - session.next.text.delta       → assistant prose
 *   - session.next.reasoning.delta  → thinking (shown collapsed/labeled)
 *   - session.next.tool.called      → a tool invocation
 * We keep blocks in arrival order so the rendered message reads top-to-bottom.
 */
type Block =
  | { kind: "text"; text: string }
  | { kind: "reasoning"; text: string }
  | { kind: "tool"; name: string; summary: string };

export interface TurnTokens {
  input: number;
  output: number;
  cost?: number;
}

export class TurnRenderer {
  private blocks: Block[] = [];

  appendText(delta: string): void {
    const last = this.blocks.at(-1);
    if (last?.kind === "text") {
      last.text += delta;
    } else {
      this.blocks.push({ kind: "text", text: delta });
    }
  }

  appendReasoning(delta: string): void {
    const last = this.blocks.at(-1);
    if (last?.kind === "reasoning") {
      last.text += delta;
    } else {
      this.blocks.push({ kind: "reasoning", text: delta });
    }
  }

  addTool(name: string, input: Record<string, unknown>): void {
    this.blocks.push({ kind: "tool", name, summary: summarizeInput(input) });
  }

  isEmpty(): boolean {
    return this.blocks.length === 0;
  }

  /** Render to MarkdownV2. `finished` toggles the trailing typing indicator. */
  render(opts: {
    finished: boolean;
    tokens?: TurnTokens;
    error?: string;
  }): string {
    const parts: string[] = [];

    for (const block of this.blocks) {
      if (block.kind === "text") {
        if (block.text.trim()) parts.push(escapeMarkdownV2(block.text.trim()));
      } else if (block.kind === "reasoning") {
        if (block.text.trim()) {
          parts.push(`💭 _${escapeMarkdownV2(block.text.trim())}_`);
        }
      } else {
        const summary = block.summary
          ? ` ${escapeMarkdownV2(block.summary)}`
          : "";
        parts.push(`🔧 \`${escapeMarkdownV2(block.name)}\`${summary}`);
      }
    }

    let body = parts.join("\n\n");

    if (opts.error) {
      body += `\n\n⚠️ ${escapeMarkdownV2(opts.error)}`;
    } else if (!opts.finished) {
      body += body ? " ▌" : "▌";
    }

    if (opts.finished && opts.tokens) {
      body += `\n\n${renderFooter(opts.tokens)}`;
    }

    return body || "…";
  }
}

function renderFooter(tokens: TurnTokens): string {
  const segments = [`↑${tokens.input}`, `↓${tokens.output}`];
  if (typeof tokens.cost === "number" && tokens.cost > 0) {
    segments.push(`$${tokens.cost.toFixed(4)}`);
  }
  return escapeMarkdownV2(`— ${segments.join(" · ")}`);
}

/** Produce a short one-line summary of a tool's input for display. */
function summarizeInput(input: Record<string, unknown>): string {
  const candidate =
    input.filePath ??
    input.path ??
    input.command ??
    input.pattern ??
    input.description;
  if (typeof candidate === "string") {
    return candidate.length > 80 ? `${candidate.slice(0, 77)}…` : candidate;
  }
  return "";
}
