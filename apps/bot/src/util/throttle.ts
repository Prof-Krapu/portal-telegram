/**
 * Coalescing throttle for Telegram message edits. Telegram rate-limits edits to
 * roughly one per second per chat, so streaming deltas must be batched.
 *
 * Call `schedule()` with the latest desired state on every delta. The runner
 * fires at most once per `intervalMs`, always using the most recent value, and
 * `flush()` forces a final immediate run (e.g. when the turn finishes).
 */
export class EditThrottle<T> {
  private latest: T | undefined;
  private hasPending = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running = false;
  private lastRunAt = 0;

  constructor(
    private readonly run: (value: T) => Promise<void>,
    private readonly intervalMs = 1100,
  ) {}

  schedule(value: T): void {
    this.latest = value;
    this.hasPending = true;
    this.maybeRun();
  }

  private maybeRun(): void {
    if (this.running || !this.hasPending || this.timer) return;

    const elapsed = Date.now() - this.lastRunAt;
    const wait = Math.max(0, this.intervalMs - elapsed);

    this.timer = setTimeout(() => {
      this.timer = null;
      void this.fire();
    }, wait);
  }

  private async fire(): Promise<void> {
    if (!this.hasPending) return;
    this.running = true;
    this.hasPending = false;
    const value = this.latest as T;
    this.lastRunAt = Date.now();

    try {
      await this.run(value);
    } catch {
      // Swallow edit errors (e.g. "message is not modified"); next delta retries.
    } finally {
      this.running = false;
      // Another delta may have arrived while we were editing.
      this.maybeRun();
    }
  }

  /** Cancel any pending timer and run immediately with the latest value. */
  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (!this.hasPending) return;
    await this.fire();
  }

  dispose(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.hasPending = false;
  }
}
