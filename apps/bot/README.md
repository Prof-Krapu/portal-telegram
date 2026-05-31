# OpenCode Telegram Bot

Drive the [OpenCode](https://opencode.ai) AI coding agent entirely from Telegram —
a replacement for the web UI. The bot talks **directly** to a running
`opencode serve` instance through the OpenCode SDK (`@opencode-ai/sdk/v2`); there
is no intermediate web server.

## Features

- **Sessions** — `/new`, `/sessions`, `/session <id>`, `/end`
- **Prompting** — send any text message to the active session; replies stream
  live by editing one message in place
- **Cancel** — a `✖ Annuler` inline button on the streaming message (the
  equivalent of the opencode CLI's `Esc`), plus `/abort`
- **Per-session model & agent** — `/model` and `/agent` inline pickers, applied
  per session like the opencode CLI
- **Permissions** — tool-permission requests appear as `Once / Always / Reject`
  inline buttons
- **Diffs** — `/diff` sends the working-tree git diff (code block, or a
  `.diff` document when large)
- **Status** — `/status`, `/health`
- **Access control** — env allowlist of Telegram IDs plus a `/pair <token>` flow

## Setup

1. Create a bot with [@BotFather](https://t.me/BotFather) and copy the token.
2. Copy `.env.example` to `.env` and fill in:
   - `TELEGRAM_BOT_TOKEN` — required
   - `TELEGRAM_ALLOWED_IDS` — comma-separated Telegram user IDs (from
     [@userinfobot](https://t.me/userinfobot))
   - `OPENCODE_PORT` or `OPENCODE_URL` — the running OpenCode server
   - `PAIR_TOKEN` — optional; if empty, a random token is printed at boot
3. Start an OpenCode server in your project:
   ```bash
   opencode serve --port 4000
   ```
4. Run the bot (from the repo root):
   ```bash
   bun run bot          # production
   bun run bot:dev      # watch mode
   ```

The bot uses long-polling (no public URL needed — ideal behind Tailscale/VPN).

## Commands

| Command         | Description                       |
| --------------- | --------------------------------- |
| `/new`          | Create a new session              |
| `/sessions`     | List sessions                     |
| `/session <id>` | Switch active session             |
| `/end`          | Delete the active session         |
| `/abort`        | Stop the running turn             |
| `/model`        | Choose the model for this session |
| `/agent`        | Choose the agent for this session |
| `/diff`         | Show uncommitted git changes      |
| `/status`       | Active session, model, server     |
| `/health`       | Check the OpenCode server         |
| `/pair <token>` | Enroll this account               |

## Development

```bash
bun run check-types
bun test
```
