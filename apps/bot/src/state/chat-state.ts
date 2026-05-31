/** Per-chat session + model selection, held in memory for the bot's lifetime. */
export interface ChatState {
  /** Active OpenCode session id, if any. */
  sessionID?: string;
  /** Model chosen for the active session (like the opencode CLI per-session model). */
  model?: { providerID: string; modelID: string };
  /** Optional reasoning/effort variant for the chosen model. */
  variant?: string;
  /** Selected agent name, if any. */
  agent?: string;
}

const states = new Map<number, ChatState>();

export function getChatState(chatId: number): ChatState {
  let state = states.get(chatId);
  if (!state) {
    state = {};
    states.set(chatId, state);
  }
  return state;
}

export function setChatState(chatId: number, patch: Partial<ChatState>): void {
  const state = getChatState(chatId);
  states.set(chatId, { ...state, ...patch });
}

/** Find which chat owns a given OpenCode session (for routing SSE events). */
export function findChatBySession(sessionID: string): number | undefined {
  for (const [chatId, state] of states) {
    if (state.sessionID === sessionID) return chatId;
  }
  return undefined;
}
