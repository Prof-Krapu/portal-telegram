import type { Api } from "grammy";
import { InlineKeyboard } from "grammy";
import type { OpencodeClient } from "@/opencode/client";
import type { Event } from "@/opencode/types";
import { TurnRenderer, type TurnTokens } from "./render";
import { EditThrottle } from "@/util/throttle";
import { splitMessage } from "@/util/markdown";

interface ActiveTurn {
  chatId: number;
  sessionID: string;
  messageId: number;
  renderer: TurnRenderer;
  throttle: EditThrottle<void>;
  tokens: TurnTokens;
}

const CANCEL_PREFIX = "cancel:";

function cancelKeyboard(sessionID: string): InlineKeyboard {
  return new InlineKeyboard().text("✖ Annuler", `${CANCEL_PREFIX}${sessionID}`);
}

/**
 * Owns the lifecycle of streamed assistant turns. For each active session it
 * holds one Telegram message that is edited in place as deltas arrive, with a
 * "✖ Annuler" inline button (the equivalent of the opencode CLI's Esc) that
 * stays attached until the turn goes idle.
 */
export class TurnManager {
  private turns = new Map<string, ActiveTurn>();

  constructor(
    private readonly api: Api,
    private readonly client: OpencodeClient,
  ) {}

  /** Called when a prompt is sent, to open the streaming message. */
  async beginTurn(chatId: number, sessionID: string): Promise<void> {
    // Clean up any stale turn for this session first.
    this.turns.get(sessionID)?.throttle.dispose();

    const sent = await this.api.sendMessage(chatId, "…", {
      reply_markup: cancelKeyboard(sessionID),
    });

    const turn: ActiveTurn = {
      chatId,
      sessionID,
      messageId: sent.message_id,
      renderer: new TurnRenderer(),
      tokens: { input: 0, output: 0 },
      throttle: undefined as unknown as EditThrottle<void>,
    };

    turn.throttle = new EditThrottle<void>(() => this.flushEdit(turn, false));
    this.turns.set(sessionID, turn);
  }

  /** Route an OpenCode event into the matching active turn. */
  async handleEvent(event: Event): Promise<void> {
    const sessionID = sessionIdOf(event);
    if (!sessionID) return;
    const turn = this.turns.get(sessionID);
    if (!turn) return;

    switch (event.type) {
      case "session.next.text.delta":
        turn.renderer.appendText(event.properties.delta);
        turn.throttle.schedule();
        break;
      case "session.next.reasoning.delta":
        turn.renderer.appendReasoning(event.properties.delta);
        turn.throttle.schedule();
        break;
      case "session.next.tool.called":
        turn.renderer.addTool(event.properties.tool, event.properties.input);
        turn.throttle.schedule();
        break;
      case "message.updated": {
        const tokens = event.properties.info as {
          tokens?: { input?: number; output?: number };
          cost?: number;
        };
        if (tokens.tokens) {
          turn.tokens = {
            input: tokens.tokens.input ?? turn.tokens.input,
            output: tokens.tokens.output ?? turn.tokens.output,
            cost: tokens.cost ?? turn.tokens.cost,
          };
        }
        break;
      }
      case "session.error":
        await this.finishTurn(sessionID, errorMessage(event));
        break;
      case "session.idle":
        await this.finishTurn(sessionID);
        break;
    }
  }

  /** Abort the active turn for a session (used by the cancel button / /abort). */
  async abort(sessionID: string): Promise<boolean> {
    const turn = this.turns.get(sessionID);
    if (!turn) return false;
    try {
      await this.client.session.abort({ sessionID });
    } catch {
      // Abort may race with completion; finishing below cleans up regardless.
    }
    await this.finishTurn(sessionID, "Annulé.");
    return true;
  }

  hasActiveTurn(sessionID: string): boolean {
    return this.turns.has(sessionID);
  }

  static cancelData(sessionID: string): string {
    return `${CANCEL_PREFIX}${sessionID}`;
  }

  static parseCancelData(data: string): string | null {
    return data.startsWith(CANCEL_PREFIX)
      ? data.slice(CANCEL_PREFIX.length)
      : null;
  }

  private async finishTurn(sessionID: string, error?: string): Promise<void> {
    const turn = this.turns.get(sessionID);
    if (!turn) return;
    this.turns.delete(sessionID);
    await turn.throttle.flush();
    turn.throttle.dispose();
    await this.flushEdit(turn, true, error);
  }

  /** Edit the Telegram message to the renderer's current state. */
  private async flushEdit(
    turn: ActiveTurn,
    finished: boolean,
    error?: string,
  ): Promise<void> {
    const text = turn.renderer.render({
      finished,
      tokens: finished ? turn.tokens : undefined,
      error,
    });
    // Telegram caps messages at 4096; keep the head in the edited message.
    const [head, ...rest] = splitMessage(text);

    await this.api.editMessageText(turn.chatId, turn.messageId, head, {
      parse_mode: "MarkdownV2",
      // Keep the cancel button while running; drop it once finished.
      reply_markup: finished ? undefined : cancelKeyboard(turn.sessionID),
    });

    // Overflow goes into follow-up messages (only on the final render).
    if (finished && rest.length > 0) {
      for (const chunk of rest) {
        await this.api.sendMessage(turn.chatId, chunk, {
          parse_mode: "MarkdownV2",
        });
      }
    }
  }
}

function sessionIdOf(event: Event): string | undefined {
  const props = (event as { properties?: { sessionID?: string } }).properties;
  return props?.sessionID;
}

function errorMessage(
  event: Extract<Event, { type: "session.error" }>,
): string {
  const error = event.properties.error;
  if (error && typeof error === "object" && "data" in error) {
    const data = (error as { data?: { message?: string } }).data;
    if (data?.message) return data.message;
  }
  return "La session a rencontré une erreur.";
}
