import type { OpencodeClient } from "./client";
import type { Event } from "./types";

type EventHandler = (event: Event) => void | Promise<void>;

/**
 * Subscribes to the OpenCode server's SSE event stream and fans events out to
 * registered handlers. A single subscription is shared by the whole bot; the
 * handlers route each event to the right chat via its sessionID.
 *
 * Automatically reconnects with exponential backoff if the stream drops (e.g.
 * the opencode server restarts).
 */
export class EventBus {
  private handlers = new Set<EventHandler>();
  private abort: AbortController | null = null;
  private stopped = false;
  private backoffMs = 1000;
  private readonly maxBackoffMs = 30000;

  constructor(private readonly client: OpencodeClient) {}

  on(handler: EventHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  start(): void {
    this.stopped = false;
    void this.loop();
  }

  stop(): void {
    this.stopped = true;
    this.abort?.abort();
  }

  private async loop(): Promise<void> {
    while (!this.stopped) {
      this.abort = new AbortController();
      try {
        const events = await this.client.event.subscribe(undefined, {
          signal: this.abort.signal,
          sseMaxRetryAttempts: 0,
        });

        // Connected — reset backoff.
        this.backoffMs = 1000;

        for await (const event of events.stream) {
          if (this.stopped) break;
          await this.dispatch(event as Event);
        }
      } catch (error) {
        if (this.stopped) return;
        console.warn(
          "[events] stream error, reconnecting:",
          error instanceof Error ? error.message : error,
        );
      }

      if (this.stopped) return;
      await this.sleep(this.backoffMs);
      this.backoffMs = Math.min(this.backoffMs * 2, this.maxBackoffMs);
    }
  }

  private async dispatch(event: Event): Promise<void> {
    for (const handler of this.handlers) {
      try {
        await handler(event);
      } catch (error) {
        console.warn(
          "[events] handler error:",
          error instanceof Error ? error.message : error,
        );
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
