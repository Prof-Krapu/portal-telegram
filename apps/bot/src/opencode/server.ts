import { createOpencodeServer } from "@opencode-ai/sdk/v2/server";
import { getPort } from "get-port-please";

export interface OpencodeServerHandle {
  /** Base URL the server is listening on, e.g. http://127.0.0.1:4096 */
  url: string;
  /** Stop the embedded `opencode serve` child process. */
  close: () => void;
}

/**
 * Start an OpenCode server bound to the given working directory. Internally the
 * SDK spawns `opencode serve` in `process.cwd()`, so callers must run this with
 * the desired workspace as the current directory.
 *
 * Picks a free port (default range starting at 4096) to avoid clashing with
 * other local servers.
 */
export async function startOpencodeServer(
  hostname = "127.0.0.1",
): Promise<OpencodeServerHandle> {
  const port = await getPort({ host: hostname, port: 4096 });
  const server = await createOpencodeServer({ hostname, port });
  return { url: server.url, close: server.close };
}
