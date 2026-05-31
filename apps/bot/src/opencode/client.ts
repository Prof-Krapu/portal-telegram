import { createOpencodeClient } from "@opencode-ai/sdk/v2/client";
import type { BotConfig } from "@/config";

export type OpencodeClient = ReturnType<typeof createOpencodeClient>;

/**
 * Build the OpenCode SDK client. The bot talks to a running `opencode serve`
 * instance directly through this client — there is no intermediate HTTP server.
 */
export function createClient(config: BotConfig): OpencodeClient {
  return createOpencodeClient({
    baseUrl: config.opencodeBaseUrl,
    ...(config.directory ? { directory: config.directory } : {}),
  });
}
