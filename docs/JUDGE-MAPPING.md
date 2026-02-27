# Judge Mapping

> Rubric criterion to evidence. Every claim has a file you can open.

## Core Criteria (100 pts)

### Enterprise Applicability, Reusability & Business Value (30 pts)

| Claim | Evidence |
|-------|----------|
| Solves real compliance bottleneck (3-5 day reviews to 30s) | [`docs/README.md`](./README.md) - Problem and Before vs. After sections |
| Works across any GitHub repo with SOC 2 or HIPAA requirements | [`src/agent/compliance-agent.ts`](../src/agent/compliance-agent.ts) - Agent is repo-agnostic, driven by webhook |
| Extensible to new frameworks (PCI-DSS, GDPR, FedRAMP) | [`src/compliance/frameworks.ts`](../src/compliance/frameworks.ts) - Add new control objects to extend |
| Organizational exceptions workflow | [`src/integrations/work-iq-client.ts`](../src/integrations/work-iq-client.ts) - `getExceptions()` API |
| Central policy management via Work IQ | [`mock-services/work-iq/`](../mock-services/work-iq/) - Full mock with real API contracts |
| Audit trail and compliance dashboard | [`mock-services/fabric-iq/`](../mock-services/fabric-iq/) - Dashboard with trends, CSV export |
| Human-in-the-loop design (advisory, not blocking) | [`docs/RAI.md`](./RAI.md) - Human-in-the-Loop Design section |

### Integration with Azure or Microsoft Solutions (25 pts)

| Service | Integration Type | Evidence |
|---------|-----------------|----------|
| **GitHub Copilot SDK** | Core agent framework | [`src/agent/compliance-agent.ts`](../src/agent/compliance-agent.ts) - `CopilotClient`, `defineTool`, `createSession` |
| **Work IQ** | HTTP client (mock + production) | [`src/integrations/work-iq-client.ts`](../src/integrations/work-iq-client.ts) |
| **Fabric IQ** | HTTP client (mock + production) | [`src/integrations/fabric-iq-client.ts`](../src/integrations/fabric-iq-client.ts) |
| **Microsoft Agent 365** | Control plane for agent governance | [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) - Agent 365 section |
| **Foundry IQ** | Agent testing and governance | [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) - Foundry IQ section |
| **Azure Entra ID** | Authentication (mock + production path) | [`src/integrations/azure-mocks.ts`](../src/integrations/azure-mocks.ts) - `validateApiKey()` |
| **Azure Key Vault** | Secrets management (mock + production path) | [`src/integrations/azure-mocks.ts`](../src/integrations/azure-mocks.ts) - `getSecret()` |
| **Azure Purview** | Data classification (PII/PHI/Financial) | [`src/integrations/azure-mocks.ts`](../src/integrations/azure-mocks.ts) - `classifyData()` |
| **Azure Monitor** | Telemetry and alerting | [`src/integrations/azure-mocks.ts`](../src/integrations/azure-mocks.ts) - `trackEvent()` |
| **Azure Container Apps** | Deployment target | [`Dockerfile`](../Dockerfile), [`docker-compose.yml`](../docker-compose.yml) |
| **Azure OpenAI** | LLM inference via BYOK | [`src/config.ts`](../src/config.ts) - `copilot.providerBaseUrl` config |
| **Defender for Cloud** | Security posture (documented) | [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) - Azure Services table |
| **Azure Policy** | Regulatory compliance (documented) | [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) - Azure Services table |
| **Event Grid** | Async webhook routing (documented) | [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) - Azure Services table |

### Operational Readiness (15 pts)

| Claim | Evidence |
|-------|----------|
| Docker multi-stage build (app vs mocks separation) | [`Dockerfile`](../Dockerfile) - `app` and `mocks` targets |
| Docker Compose with health checks | [`docker-compose.yml`](../docker-compose.yml) - Health checks on all 3 services |
| One-command local dev startup | [`package.json`](../package.json) - `npm run dev:all` |
| Environment-based configuration | [`src/config.ts`](../src/config.ts), [`env.example`](../env.example) |
| Azure Container Apps deployment instructions | [`docs/SETUP.md`](./SETUP.md) - Production Deployment section |
| CI/CD pipeline design (GitHub Actions) | [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) - CI/CD section |
| Telemetry and observability | [`src/integrations/azure-mocks.ts`](../src/integrations/azure-mocks.ts) - Monitor mock with production swap path |
| Test suite | [`test/`](../test/) - Unit and integration tests |

### Security, Governance & Responsible AI (15 pts)

| Claim | Evidence |
|-------|----------|
| Webhook HMAC-SHA256 signature verification | [`src/index.ts`](../src/index.ts) - Webhook handler |
| API key authentication middleware | [`src/integrations/azure-mocks.ts`](../src/integrations/azure-mocks.ts) - Entra ID mock |
| Secrets management (env vars, Key Vault path) | [`src/config.ts`](../src/config.ts), [`src/integrations/azure-mocks.ts`](../src/integrations/azure-mocks.ts) |
| Agent governance via Agent 365 | [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) - Agent 365 section, [`docs/RAI.md`](./RAI.md) - Agent Governance section |
| Human-in-the-loop (advisory, never blocking) | [`docs/RAI.md`](./RAI.md) - Human-in-the-Loop Design |
| Responsible AI considerations | [`docs/RAI.md`](./RAI.md) - Full document (bias, limitations, transparency, incident response) |
| Least-privilege token scoping | [`docs/RAI.md`](./RAI.md) - Data Privacy section |
| No source code persistence | [`docs/RAI.md`](./RAI.md) - Data Privacy section |

### Storytelling, Clarity & Amplification Quality (15 pts)

| Claim | Evidence |
|-------|----------|
| Problem/solution narrative | [`docs/README.md`](./README.md) - The Problem / The Solution |
| Before vs. After metrics table | [`docs/README.md`](./README.md) - Before vs. After |
| Architecture diagram (mermaid) | [`docs/README.md`](./README.md) - Architecture section |
| 150-word summary | [`presentations/summary.md`](../presentations/summary.md) |
| Presentation deck | [`presentations/ComplianceCopilot.pptx`](../presentations/ComplianceCopilot.pptx) |
| Demo setup script | [`scripts/demo-setup.sh`](../scripts/demo-setup.sh) |
| Video with voiceovers | External: `presentations/compliance-copilot/` |

## Bonus Points (35 pts)

### Work IQ / Fabric IQ / Foundry IQ (15 pts)

| Service | Status | Evidence |
|---------|--------|----------|
| **Work IQ** | Implemented (mock + client) | [`src/integrations/work-iq-client.ts`](../src/integrations/work-iq-client.ts), [`mock-services/work-iq/`](../mock-services/work-iq/) |
| **Fabric IQ** | Implemented (mock + client + dashboard) | [`src/integrations/fabric-iq-client.ts`](../src/integrations/fabric-iq-client.ts), [`mock-services/fabric-iq/`](../mock-services/fabric-iq/) |
| **Foundry IQ** | Documented integration | [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) - Foundry IQ section |

### Copilot SDK Product Feedback (10 pts)

See [`docs/SDK-FEEDBACK.md`](./SDK-FEEDBACK.md) for detailed feedback filed in the Copilot SDK Teams channel.

### Customer Validation (10 pts)

Not yet completed. Requires validated engagement with an internal or external customer.
