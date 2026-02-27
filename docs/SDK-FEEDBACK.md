# GitHub Copilot SDK Feedback

> Feedback from building Compliance Copilot with `@github/copilot-sdk` v0.1.26. Filed in the Copilot SDK Teams channel.

## What Worked Well

**1. `defineTool` + Zod v4 is excellent DX**
The tool definition API is clean and intuitive. Defining a tool with a name, description, Zod schema, and handler function is exactly the right abstraction. The agent autonomously deciding which tools to call based on the system prompt and user message -- without explicit orchestration code -- is the key value proposition.

**2. System prompt control is powerful**
The `systemMessage` option with `"append"` and `"replace"` modes gives the right level of control. For Compliance Copilot, we use `"replace"` to provide a domain-specific compliance expert persona, and the agent stays in character across complex multi-tool reasoning chains.

**3. BYOK provider support**
Being able to swap the LLM backend via `provider` config (OpenAI, Azure OpenAI, Anthropic) without changing any agent code is important for enterprise customers who have existing Azure OpenAI deployments.

## Pain Points & Suggestions

**1. No streaming / progress feedback for long-running tool calls**
When the agent calls `fetch_pr_diff` on a large PR (500+ changed lines), there's no way to stream progress back to the caller. The `sendAndWait()` call blocks until all tools complete. For a webhook-triggered agent that takes 30+ seconds, it would be valuable to have a streaming callback or progress event.

*Suggestion:* Add a `session.sendWithProgress()` that yields intermediate events (tool call started, tool call completed, partial response).

**2. Tool error handling is opaque**
When a tool handler throws, the error is swallowed into the agent's reasoning context but there's no structured way for the calling code to know which tool failed or why. We had to add try/catch wrappers inside every tool handler and manually log errors.

*Suggestion:* Add a `toolError` event or callback that fires when a tool handler throws, with the tool name, error, and input that caused it.

**3. Session management for server-side agents**
The SDK's session model is designed for interactive chat (create session, send messages back and forth). For our use case -- a server-side agent triggered by a webhook that runs once and exits -- we create a new session per webhook event. It's unclear whether this is the intended pattern or if we should be reusing sessions.

*Suggestion:* Document the recommended pattern for server-side/batch agents. Consider a `session.runOnce(message)` convenience method that creates, sends, waits, and cleans up in one call.

**4. TypeScript types could be stricter**
The `defineTool` return type and `session.sendAndWait()` response type are loosely typed. We ended up casting responses and adding our own type assertions. For an SDK targeting TypeScript-first developers, tighter generics would improve the experience.

**5. Documentation gaps**
- No examples of server-side (non-interactive) agent usage
- No guidance on tool composition patterns (tools that call other tools)
- The Zod v4 requirement isn't documented prominently (caused initial confusion with Zod v3 installs)

## Feature Requests

1. **Tool call telemetry** -- Built-in metrics for tool call count, duration, success/failure rate per tool. Critical for production monitoring.
2. **Rate limiting / circuit breaker** -- For tools that call external APIs (like our Work IQ client), built-in rate limiting or circuit breaker support would prevent cascading failures.
3. **Multi-agent orchestration** -- For complex workflows (e.g., one agent reviews code, another agent reviews the review), native support for agent-to-agent communication would be valuable.

## Summary

The Copilot SDK is the right abstraction for building domain-specific AI agents. The tool system is the standout feature -- it lets developers focus on domain logic while the SDK handles reasoning and orchestration. The main gaps are around server-side/batch usage patterns and observability. These are solvable and we expect rapid improvement given the SDK is at v0.1.x.
