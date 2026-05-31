#!/usr/bin/env bash
#
# opentelegram installer — drive OpenCode from Telegram, in any folder.
#
#   curl -fsSL https://raw.githubusercontent.com/Prof-Krapu/portal-telegram/claude/telegram-bot-migration-y3NzW/install.sh | bash
#
set -euo pipefail

REPO_URL="https://github.com/Prof-Krapu/portal-telegram.git"
REPO_BRANCH="claude/telegram-bot-migration-y3NzW"
APP_DIR="${HOME}/.opentelegram/app"
BIN_DIR="${HOME}/.local/bin"
BIN_PATH="${BIN_DIR}/opentelegram"

info() { printf '\033[1;34m▸\033[0m %s\n' "$1"; }
ok()   { printf '\033[1;32m✓\033[0m %s\n' "$1"; }
warn() { printf '\033[1;33m!\033[0m %s\n' "$1"; }
err()  { printf '\033[1;31m✗\033[0m %s\n' "$1" >&2; }

need_cmd() { command -v "$1" >/dev/null 2>&1; }

ensure_bun() {
  if need_cmd bun; then
    ok "Bun found ($(bun --version))"
    return
  fi
  info "Installing Bun…"
  curl -fsSL https://bun.sh/install | bash
  # Make bun available for the rest of this script.
  export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
  export PATH="$BUN_INSTALL/bin:$PATH"
  need_cmd bun || { err "Bun installation failed. Install it manually: https://bun.sh"; exit 1; }
  ok "Bun installed"
}

ensure_opencode() {
  if need_cmd opencode; then
    ok "OpenCode found"
    return
  fi
  info "Installing OpenCode…"
  bun install -g opencode-ai >/dev/null 2>&1 || bun install -g opencode >/dev/null 2>&1 || true
  if ! need_cmd opencode; then
    warn "Could not install OpenCode automatically."
    warn "Install it yourself before running opentelegram: https://opencode.ai"
  else
    ok "OpenCode installed"
  fi
}

fetch_source() {
  if [ -d "${APP_DIR}/.git" ]; then
    info "Updating opentelegram source…"
    git -C "${APP_DIR}" fetch --depth 1 origin "${REPO_BRANCH}" >/dev/null 2>&1
    git -C "${APP_DIR}" checkout -q "${REPO_BRANCH}"
    git -C "${APP_DIR}" reset --hard -q "origin/${REPO_BRANCH}"
  else
    info "Downloading opentelegram source…"
    mkdir -p "$(dirname "${APP_DIR}")"
    git clone --depth 1 --branch "${REPO_BRANCH}" "${REPO_URL}" "${APP_DIR}" >/dev/null 2>&1
  fi
  ok "Source ready"
}

build_binary() {
  info "Installing dependencies…"
  (cd "${APP_DIR}" && bun install >/dev/null 2>&1)

  info "Building the opentelegram binary…"
  mkdir -p "${BIN_DIR}"
  (cd "${APP_DIR}/apps/bot" && bun build src/cli.ts --compile --outfile "${BIN_PATH}" >/dev/null 2>&1)
  chmod +x "${BIN_PATH}"
  ok "Installed to ${BIN_PATH}"
}

ensure_path() {
  case ":${PATH}:" in
    *":${BIN_DIR}:"*) return ;;
  esac
  warn "${BIN_DIR} is not on your PATH."
  local rc=""
  case "${SHELL:-}" in
    *zsh)  rc="${HOME}/.zshrc" ;;
    *bash) rc="${HOME}/.bashrc" ;;
  esac
  if [ -n "${rc}" ]; then
    printf '\nexport PATH="%s:$PATH"\n' "${BIN_DIR}" >> "${rc}"
    ok "Added ${BIN_DIR} to PATH in ${rc} (restart your shell)"
  else
    warn "Add this to your shell profile:  export PATH=\"${BIN_DIR}:\$PATH\""
  fi
}

main() {
  echo ""
  info "Installing opentelegram"
  ensure_bun
  ensure_opencode
  fetch_source
  build_binary
  ensure_path
  echo ""
  ok "Done!"
  echo ""
  echo "  Next steps:"
  echo "    1. cd into any project you want to work on"
  echo "    2. run:  opentelegram"
  echo "    3. follow the one-time setup to connect your Telegram bot"
  echo ""
}

main "$@"
