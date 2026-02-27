# Mock vs. Production: What's Real, What's Stubbed

> Honest accounting of implementation state and production swap steps.

## Summary

The Compliance Copilot agent itself is **fully implemented** -- it runs, processes PRs, and produces real compliance reviews. The external service integrations fall into three tiers:

- **Tier 1: Implemented** -- Working code with mock backends that share API contracts with production
- **Tier 2: Configured** -- Code path exists, activated by environment variable
- **Tier 3: Documented** -- Architecture and swap path described, no code yet

## Tier 1: Implemented with Mock Backends

These have working HTTP clients in the agent AND standalone mock servers that implement the same API contracts as the production SaaS.

| Component | What's Real | What's Mocked | Swap to Production |
|-----------|-------------|---------------|-------------------|
| **Copilot SDK Agent** | Full agent with 5 custom tools, system prompt, session management | Nothing -- this is production code | Already production-ready |
| **GitHub Integration** | Octokit client for PR diffs and comment posting | Nothing -- calls real GitHub API | Already production-ready |
| **Work IQ** | HTTP client (`work-iq-client.ts`) with full API contract | Mock Express server with JSON policy data | Set `WORK_IQ_URL` to SaaS endpoint |
| **Fabric IQ** | HTTP client (`fabric-iq-client.ts`) with full API contract | Mock Express server with in-memory store + dashboard | Set `FABRIC_IQ_URL` to SaaS endpoint |
| **Webhook Handler** | HMAC-SHA256 signature verification, event routing | Nothing -- this is production code | Already production-ready |

**Key point:** The Work IQ and Fabric IQ clients are production code. Only the backends are mocked. Swapping requires changing one environment variable each -- zero code changes.

## Tier 2: Configured via Environment

These have code that works in both mock and production modes, selected by environment variables.

| Component | Mock Mode | Production Mode | Swap Steps |
|-----------|-----------|-----------------|------------|
| **Azure Purview** (data classification) | In-process regex patterns (`classifyData()` in `azure-mocks.ts`) | Purview REST API | 1. Set `AZURE_PURVIEW_URL` 2. Replace import in agent tools |
| **Azure Entra ID** (authentication) | Accepts any non-empty API key (`validateApiKey()` in `azure-mocks.ts`) | JWT validation against Entra | 1. Set `AZURE_TENANT_ID`, `AZURE_CLIENT_ID` 2. Add `@azure/identity` 3. Replace middleware |
| **Azure Key Vault** (secrets) | Reads from `process.env` (`getSecret()` in `azure-mocks.ts`) | Key Vault SDK | 1. Set `AZURE_KEY_VAULT_URL` 2. Add `@azure/keyvault-secrets` 3. Replace `getSecret()` calls |
| **Azure Monitor** (telemetry) | Logs to console (`trackEvent()` in `azure-mocks.ts`) | Application Insights | 1. Set `AZURE_MONITOR_CONNECTION_STRING` 2. Add `applicationinsights` 3. Replace `trackEvent()` calls |
| **Azure OpenAI** (LLM backend) | Uses GitHub Copilot backend (default) | Azure OpenAI GPT-4o | Set `COPILOT_PROVIDER_BASE_URL` and `COPILOT_PROVIDER_API_KEY` |

**Key point:** All Tier 2 mocks implement the same function signatures as the production SDKs. The mock file (`azure-mocks.ts`) has comments like `// In production: await secretClient.getSecret(name)` at each swap point.

## Tier 3: Documented with Architecture Path

These are described in the architecture doc with clear production integration paths but have no code in the current codebase.

| Component | Why It's Here | Production Integration |
|-----------|---------------|----------------------|
| **Microsoft Agent 365** | Control plane for governing the Copilot agent at enterprise scale | Register agent in Admin Center with Entra Agent ID; Agent 365 handles guardrails, access governance, compliance audit |
| **Foundry IQ** | Agent testing and governance | Use Foundry IQ SDK for test scenarios, guardrail enforcement, usage analytics |
| **Defender for Cloud** | Security posture for Container Apps environment | Enable Defender on resource group; pull recommendations via Defender API as additional review context |
| **Azure Policy** | Regulatory compliance initiatives (SOC 2, HIPAA built-in) | Query Azure Policy compliance state per-subscription to enrich reviews |
| **Event Grid** | Reliable async webhook delivery at scale | Route GitHub webhooks through Event Grid topic for fan-out to Container Apps workers |
| **GitHub Actions** | CI/CD pipeline | Add workflow YAML for build, test, deploy, self-review loop |

## Architecture Diagram: Implementation Depth

```
FULLY IMPLEMENTED          CONFIGURED (ENV SWAP)       DOCUMENTED
==================         =====================       ==========
Copilot SDK Agent          Azure Purview               Agent 365
GitHub PR Client           Azure Entra ID              Foundry IQ
Work IQ Client + Mock      Azure Key Vault             Defender
Fabric IQ Client + Mock    Azure Monitor               Azure Policy
Webhook Handler            Azure OpenAI (BYOK)         Event Grid
Comment Formatter                                      GitHub Actions
Compliance Frameworks
Dashboard (HTML/JS)
```

## What "Production-Ready" Means Here

1. **The agent works today.** Point it at a real GitHub repo, and it will review PRs with real compliance analysis.
2. **External service mocks are contract-compatible.** The mock APIs implement the same endpoints, request/response shapes, and error codes as the production SaaS. This is by design -- the agent code doesn't know or care whether it's talking to a mock or the real service.
3. **Swapping is configuration, not refactoring.** Tier 1 swaps are a single environment variable. Tier 2 swaps require adding an Azure SDK dependency and replacing one import. No architectural changes needed.
