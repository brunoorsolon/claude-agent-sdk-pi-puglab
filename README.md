> [!WARNING]
> **Unofficial maintained fork.** The original project is [prateekmedia/claude-agent-sdk-pi](https://github.com/prateekmedia/claude-agent-sdk-pi), by Prateek Sunal. This fork is maintained at [brunoorsolon/claude-agent-sdk-pi-puglab](https://github.com/brunoorsolon/claude-agent-sdk-pi-puglab) and uses the separate npm name `@puglab/claude-agent-sdk-pi`. It is not endorsed by the original maintainer or Anthropic. [Fork changes, validation, and release instructions](FORK.md).

# @puglab/claude-agent-sdk-pi

This extension registers a custom provider that routes LLM calls through the **Claude Agent SDK** while **pi executes tools** and renders tool results in the TUI.

## Highlights

- Claude Agent SDK is used as the LLM backend (Claude Code auth or API key).
- Tool execution is **blocked in Claude Code**; pi executes tools natively.
- Built-in tool calls are mapped to Claude Code tool names.
- Custom tools are exposed to Claude Code via in-process MCP.
- Pi’s complete effective system prompt reaches the SDK unchanged, including parent context, role instructions, project instructions, and skills.

## Demo

![Demo](screenshot.png)

## Setup

1) Install the extension globally (npm is the preferred source now):

```
pi install npm:@puglab/claude-agent-sdk-pi@1.0.24
```

Keep the exact version in consumer configuration and preserve the consumer lockfile where applicable.

**Alternative (git):**

```
pi install git:github.com/brunoorsolon/claude-agent-sdk-pi-puglab@v1.0.24
```

See **pi-coding-agent** install docs for other install sources and paths.

2) **Authenticate** (choose one):

- **Claude Code login** (Pro/Max):
  ```bash
  npx @anthropic-ai/claude-code
  ```
  Ensure no API key env vars are set.

- **API key** (API plan):
  ```bash
  export ANTHROPIC_API_KEY=sk-ant-...
  ```

3) Reload pi:

```
/reload
```

## Provider ID

`claude-agent-sdk`

Use `/model` to select:
- `claude-agent-sdk/claude-opus-4-5`
- `claude-agent-sdk/claude-haiku-4-5`

## Tool Behavior

- Claude Code **proposes** tool calls.
- pi **executes** them.
- Tool execution in Claude Code is **denied**.

Built-in tool mapping (Claude Code → pi):

- Read → read
- Write → write
- Edit → edit
- Bash → bash
- Grep → grep
- Glob → find

Claude Code only sees the tools that are active in pi.

### Custom tools

Any extra tools registered in pi are exposed to Claude Code via an in-process MCP server:

- MCP server name: `custom-tools`
- Claude Code tool name format: `mcp__custom-tools__<toolName>`
- Example: `mcp__custom-tools__subagent`

The provider automatically maps these back to the pi tool name (e.g. `subagent`).

## Thinking and output limits

Claude Code counts thinking and text against one output limit, and clamps a manual thinking budget to one token below it. The provider therefore sets the budget (`--max-thinking-tokens`) and the limit (`CLAUDE_CODE_MAX_OUTPUT_TOKENS`) from the same numbers:

- **Adaptive models** (every model except Claude 3, Opus 4.0, 4.1 and 4.5, Sonnet 4.0 and 4.5, and Haiku 4.5, matching Claude Code’s own list) get `--thinking adaptive` and an effort level from Pi’s thinking level. The provider sends no budget and leaves the output limit to Claude Code’s model default or your own `CLAUDE_CODE_MAX_OUTPUT_TOKENS`. Pi’s per-request `maxTokens` is not forwarded.
- **Other reasoning models** get a manual budget from Pi’s thinking level or your `thinkingBudgets`. The output limit is the budget plus 32,000 tokens of text room, capped at the model’s output limit; 32,000 is assumed when Pi’s model metadata has no valid limit. When the limit is too small for that text room, thinking takes at most half of it, but never less than the API’s 1,024-token minimum budget. A limit of 1,024 tokens or less disables thinking.
- **Explicit caps bound manual budgets.** Pi’s per-request `maxTokens` (Pi compaction sets one) and your own `CLAUDE_CODE_MAX_OUTPUT_TOKENS` are each a ceiling for the whole output; the lower one applies, still capped at the model’s output limit. The provider never raises a cap to make room for thinking; it shrinks the thinking budget instead.
- Requests without a thinking level send no thinking or output settings.

## Context loading

The provider always transmits Pi’s effective system prompt verbatim: `context.systemPrompt` under Pi 0.74, or, because Pi 1.x passes providers only a `{ messages }` transcript, the prompt and tool list rebuilt from its system messages with Pi’s own `getCurrentSystemPrompt` and `getCurrentTools`. Pi owns instruction assembly. The provider does not reread `AGENTS.md`, extract selected skills, rename tools in instructions, or rewrite instruction text or paths. Built-in tool-name and argument-key mapping described above remains unchanged; tool paths are no longer rewritten to compensate for rewritten skill instructions.

- **Default (`appendSystemPrompt: true`):** append the complete Pi prompt once to the SDK’s `claude_code` preset.
- **Changed behavior (`appendSystemPrompt: false`):** use the complete Pi prompt as the SDK’s replacement system prompt, without the Claude Code preset. This setting no longer suppresses Pi instructions. Existing users who relied on Claude-only instructions must migrate; there is no silent instruction opt-out. If you followed the previous symlink setup, remove the `~/.claude/CLAUDE.md` and `~/.claude/skills` links to Pi resources when they duplicate Pi’s prompt; remove only the symlinks, not their targets.
- `settingSources` still selects Claude Code filesystem settings. With `appendSystemPrompt: false`, its default remains `["user", "project"]`. Explicitly selected Claude resources are additional to Pi’s prompt; avoid linking the same instructions into both systems.
- `strictMcpConfig` still defaults to `false` in append mode and `true` in replacement mode. Enable it to prevent unrelated MCP servers from being auto-loaded. SDK-side execution remains denied in either mode.

For the Claude Code preset plus Pi’s complete prompt, without inherited settings or MCP servers:

```json
{
  "claudeAgentSdkProvider": {
    "appendSystemPrompt": true,
    "settingSources": [],
    "strictMcpConfig": true
  }
}
```

### Custom-tool schema compatibility

Pi supplies JSON Schema, while the Agent SDK’s high-level `tools[].inputSchema` interface expects a Zod raw shape. The provider uses the public low-level MCP request handlers on the SDK-created server instead: `tools/list` advertises Pi’s original JSON Schema without conversion, and `tools/call` returns the existing execution-denied error. This preserves required fields, nested objects, arrays, enums, references, records, and validation constraints without a lossy Zod round trip. Invalid MCP tool envelopes fail with the offending Pi tool’s name rather than falling back to an empty schema. Pi remains responsible for validating and executing actual calls.

### Compatibility checks

Development dependencies retain upstream’s Pi 0.74.x baseline; peer ranges also allow Pi 1.4 and later compatible 1.x releases. Pi 1.x’s extension loader supplies the legacy API compatibility view used by this extension. Run `npm ci --ignore-scripts`, `npm test`, and `npm run typecheck` on Node 24. To repeat the same seam checks with another installed Pi version, set `PI_TEST_AGENT_ENTRY` to the file URL of that installation’s `dist/index.js`. The tests load the extension through Pi’s actual loader and run the official SDK against a disposable, credential-free transport fixture. Under Pi 1.x loaders each provider call receives a `{ messages }` transcript shaped like Pi’s own: the prompt in system-message `sections`, and tools as additions and removals. They check effective instruction transmission, actual MCP discovery, Pi-side tool argument/result delivery, SDK execution denial, streaming, adaptive and manual thinking settings with the child process's output limit, invalid contracts, and cancellation. They do not contact Claude or prove live subscription access.
