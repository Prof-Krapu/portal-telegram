// Re-export the OpenCode SDK v2 types the bot relies on, so the rest of the
// codebase imports them from one place instead of deep SDK paths.
export type {
  Event,
  Message,
  Part,
  TextPart,
  ReasoningPart,
  ToolPart,
  Session,
  Provider,
  Model,
  PermissionRequest,
} from "@opencode-ai/sdk/v2";
