# OpenCode Telegram Bot

> **Disclaimer**: This is a **personal project** and is **not related** to [https://github.com/sst/opencode](https://github.com/sst/opencode) or the SST team. It is a personal-built interface for interacting with OpenCode instances.

A **Telegram bot** for [OpenCode](https://opencode.ai), the AI coding agent. It
lets you drive OpenCode sessions entirely from Telegram — sending prompts,
streaming replies, approving permissions, switching models, and viewing diffs —
as a replacement for the original web UI.

The bot talks **directly** to a running `opencode serve` instance through the
OpenCode SDK; there is no web server in between.

## Quick Start (recommended)

Install with one command:

```bash
curl -fsSL https://raw.githubusercontent.com/Prof-Krapu/portal-telegram/claude/telegram-bot-migration-y3NzW/install.sh | bash
```

This installs Bun and OpenCode (if missing), builds a standalone `opentelegram`
binary, and adds it to your `PATH`. Then, from **any** project folder:

```bash
opentelegram
```

The first run launches a short setup wizard (connect your Telegram bot, authorize
your account). After that, `opentelegram` starts an OpenCode server bound to the
current folder and brings the bot online for that workspace.

| Command | Description |
| --- | --- |
| `opentelegram` | Start the bot for the current folder |
| `opentelegram config` | Show the saved configuration |
| `opentelegram --reconfigure` | Re-run the setup wizard |
| `opentelegram stop` | Clear a stale single-instance lock |

Only one `opentelegram` instance runs at a time (a Telegram long-polling
constraint). It uses long-polling, so no public URL is required — ideal for a VPS
behind [Tailscale](https://tailscale.com).

## Manual / development setup

1. Create a bot with [@BotFather](https://t.me/BotFather) and copy the token.
2. Configure the bot:
   ```bash
   cd apps/bot
   cp .env.example .env
   # set TELEGRAM_BOT_TOKEN, TELEGRAM_ALLOWED_IDS, OPENCODE_PORT
   ```
3. Start an OpenCode server in your project directory:
   ```bash
   opencode serve --port 4000
   ```
4. Run the bot from the repo root:
   ```bash
   bun install
   bun run bot          # or: bun run bot:dev for watch mode
   ```

See [`apps/bot/README.md`](apps/bot/README.md) for the full command reference.

### Prerequisites

OpenCode must be installed on your system. Install it using one of these methods:

```bash
# Using bun
bun install -g opencode

# Using Homebrew (macOS)
brew install sst/tap/opencode
```

## Commands

Send any text message to prompt the active session. Available commands:

- `/new`, `/sessions`, `/session <id>`, `/end` — session management
- `/abort` (or the `✖ Annuler` button) — stop the running turn
- `/model`, `/agent` — pick the model / agent per session
- `/diff` — show uncommitted git changes
- `/status`, `/health` — connection and session info
- `/pair <token>` — enroll a new account

## Why This Project?

OpenCode ships an official web UI and TUI, but neither is convenient from a
phone. This bot lets you start sessions, send prompts, approve tool permissions,
switch models, and review diffs from anywhere via Telegram.

## Use Case

Deploy the bot on a VPS alongside OpenCode and reach it from Telegram on any
device. Because the bot uses long-polling, no inbound ports or public URL are
required; running it behind [Tailscale](https://tailscale.com) keeps the
OpenCode server private.

## Tech Stack

- [grammY](https://grammy.dev) - Telegram bot framework
- [OpenCode SDK](https://www.npmjs.com/package/@opencode-ai/sdk) - OpenCode API client (v2)
- [Bun](https://bun.sh) - Runtime & package manager
- [Turborepo](https://turbo.build) - Monorepo tooling

## Contributing

Contributions are welcome! Here's how you can help:

### Feedback & Feature Requests

Visit [oc-portal.userjot.com](https://oc-portal.userjot.com/) to submit feedback and feature requests.

### Reporting Issues

- **Bugs**: Report bugs by opening an issue with a clear description and steps to reproduce

### Development Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/portal.git
   cd portal
   ```
3. Install dependencies:
   ```bash
   bun install
   ```
4. Run the development server:
   ```bash
   bun dev
   ```

### Pull Request Process

1. Create a feature branch from `main`
2. Make your changes following the existing code style
3. Test your changes thoroughly
4. Update documentation if needed
5. Submit a pull request with a clear description

### Code Style

- Use TypeScript for all new code
- Follow the existing component patterns in `apps/web/src/components/`
- Use Tailwind CSS for styling
- Maintain consistent naming conventions
- Add proper TypeScript types

### Getting Help

- Join our [Discord community](https://discord.gg/7UJ5KYfhNE)
- Check existing [issues](https://github.com/hosenur/portal/issues) before creating new ones
- Join the discussion in existing issues
- Be respectful and constructive in all interactions

## License

MIT
