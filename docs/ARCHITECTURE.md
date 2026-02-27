# Architecture

## System Overview

Compliance Copilot is a **single deployable agent** that integrates with external Microsoft SaaS platforms and Azure services to deliver end-to-end compliance automation:

```
                    ┌───────────────────────────────────────────┐
                    │         Microsoft Agent 365                │
                    │     (Control plane for all agents)         │
                    │  Registry · Guardrails · Security · Audit  │
                    └────────┬──────────────────────┬────────────┘
                             │  governs             │  secures
                         ┌───▼──────────────────┐   │
    ┌──────────────┐     │  Compliance Copilot  │   │
    │   GitHub     │────▶│  (Copilot SDK Agent) │   │
    │  (webhooks)  │     │                      │   │
    └──────────────┘     │  Azure Container Apps│   │
                         └──┬──────┬─────┬──────┘   │
                            │      │     │          │
                   ┌────────▼──┐ ┌─▼───────┐ ┌─────▼──────────┐
                   │  Work IQ  │ │Fabric IQ│ │ Azure Services  │
                   │  (SaaS)   │ │(SaaS)   │ │                 │
                   │           │ │         │ │ Entra ID        │
                   │ Policies  │ │ Audit & │ │ Key Vault       │
                   │ Controls  │ │Dashboard│ │ Purview         │
                   │ Exceptions│ │ Trends  │ │ Monitor         │
                   └───────────┘ └─────────┘ │ Defender        │
                                             │ Azure OpenAI    │
                                             │ Azure Policy    │
                                             │ Event Grid      │
                                             └─────────────────┘
```

| Pillar | Role | Integration |
|--------|------|-------------|
| **Microsoft Agent 365** | Control plane — registry, guardrails, security, and audit for all agents | Governs the Compliance Copilot agent lifecycle |
| **GitHub Copilot SDK** | AI reasoning engine with custom tool execution | Embedded in the agent |
| **Work IQ** | Enterprise policy management (compliance controls, exceptions) | External SaaS — HTTP API via `WORK_IQ_URL` |
| **Fabric IQ** | Audit trail and compliance dashboard (review records, trends) | External SaaS — HTTP API via `FABRIC_IQ_URL` |
| **Foundry IQ** | Agent building, testing, and governance for Copilot extensions | Agent lifecycle management |

The Compliance Copilot is the only artifact you build and deploy. In production, it is registered in **Microsoft Agent 365** — the enterprise control plane that provides a unified registry, IT-defined guardrails, access governance, and security posture management for all AI agents across the organization. Agent 365 extends familiar Microsoft management and security tools (Entra ID, Defender, Purview) with purpose-built capabilities for agents.

Work IQ, Fabric IQ, and Foundry IQ are external Microsoft services — the agent connects to them via URL configuration or SDK integration. For local development and demo purposes, mock implementations of Work IQ and Fabric IQ are provided in `mock-services/` and run as separate containers via Docker Compose.

For local development and demo purposes, mock implementations of Work IQ and Fabric IQ are provided in `mock-services/` and run as separate containers via Docker Compose.

## Component Architecture

### Express Server (`src/index.ts`)
- Receives GitHub webhook events (PR opened/synchronized)
- Verifies webhook signatures using HMAC-SHA256
- Routes events to the compliance agent
- Provides manual trigger endpoint for testing
- Health check endpoint for container orchestration

### Copilot SDK Agent (`src/agent/`)
The core intelligence layer. Uses `@github/copilot-sdk` to create an AI session with 5 custom tools:

| Tool | Purpose | Data Source |
|------|---------|-------------|
| `fetch_pr_diff` | Read changed files from PR | GitHub API |
| `query_compliance_policies` | Look up applicable controls | Work IQ |
| `classify_sensitive_data` | Identify PII/PHI/financial data | Azure Purview patterns |
| `get_org_exceptions` | Check for approved exceptions | Work IQ |
| `store_audit_record` | Record review for compliance tracking | Fabric IQ |

The agent autonomously decides which tools to call based on the PR content. This is the key differentiator: **semantic code understanding** rather than just pattern matching.

### Compliance Frameworks (`src/compliance/`)
- **frameworks.ts** — SOC 2 Type II (9 controls) and HIPAA (7 controls) definitions
- **patterns.ts** — Regex/keyword patterns for sensitive data detection and vulnerability scanning
- Extensible: PCI-DSS and other frameworks can be added by defining new control objects

### GitHub Integration (`src/github/`)
- **pr-client.ts** — Octokit-based client for reading PR diffs and posting comments
- **comment-formatter.ts** — Generates structured markdown review comments with severity icons, framework badges, and remediation guidance

### Integration Clients (`src/integrations/`)
- **work-iq-client.ts** — HTTP client for Work IQ policy API (external SaaS)
- **fabric-iq-client.ts** — HTTP client for Fabric IQ audit API (external SaaS)
- **azure-mocks.ts** — In-process stubs for Azure Purview (data classification), Entra ID (authentication), Key Vault (secrets), and Monitor (telemetry)

## Microsoft Service Integrations

### Microsoft Agent 365 — Control Plane

[Microsoft Agent 365](https://www.microsoft.com/en-us/microsoft-agent-365) is the **enterprise control plane for AI agents**. It extends the infrastructure organizations already use for managing users — Entra ID, Defender, Purview, Admin Center — with purpose-built capabilities for agents.

In production, the Compliance Copilot is registered in Agent 365, which provides:

- **Agent registry** — The Compliance Copilot appears in the organization's centralized agent inventory alongside all other AI agents, with an Entra Agent ID for identity management
- **Agent store** — Users discover and deploy the Compliance Copilot through familiar workflows in Microsoft 365 Copilot and Teams
- **IT-defined guardrails** — IT admins set policies for who can deploy, configure, and manage the Compliance Copilot. Standard policy templates ensure the agent starts secure
- **Access governance** — Least-privilege enforcement ensures the agent only accesses the GitHub repos, Work IQ endpoints, and Fabric IQ endpoints it needs
- **Compliance & audit** — All agent interactions are logged with content safety controls to detect, retain, and investigate agent behavior
- **Security posture** — Defender identifies attack paths from the agent to critical assets, remediates misconfigurations, and provides runtime defense against prompt injection and data exfiltration
- **Performance measurement** — Track agent speed, review quality, and ROI across the organization
- **Work IQ integration** — Agent 365 natively connects agents with Work IQ, enabling the Compliance Copilot to access organizational data, context, and relationships

Agent 365 is the natural management layer for any Copilot SDK agent deployed at enterprise scale. It answers the question: "How do we govern 50 AI agents across the organization?" — with the same tools IT already uses for managing users.

### Work IQ — Policy Management

Work IQ is an **external SaaS platform** that provides organizational knowledge and compliance controls. The Compliance Copilot queries Work IQ for the policies and exceptions that apply to each PR.

| Config | API Endpoints |
|--------|---------------|
| `WORK_IQ_URL` | `/api/workiq/policies`, `/api/workiq/exceptions`, `/api/workiq/search` |

**How it's used:** The agent's `query_compliance_policies` and `get_org_exceptions` tools call Work IQ to retrieve SOC 2 / HIPAA controls and any approved organizational exceptions. This means compliance policies are managed centrally in Work IQ and applied consistently across all repositories.

### Fabric IQ — Audit & Analytics

Fabric IQ is an **external SaaS platform** for compliance analytics, audit trail, and reporting dashboards. Every review the Copilot performs is recorded in Fabric IQ.

| Config | API Endpoints |
|--------|---------------|
| `FABRIC_IQ_URL` | `/api/fabriciq/audit`, `/api/fabriciq/dashboard`, `/api/fabriciq/trends`, `/api/fabriciq/reviews` |

**How it's used:** The agent's `store_audit_record` tool posts structured findings to Fabric IQ after each review. The Fabric IQ dashboard provides real-time compliance posture visualization — score trends, finding breakdowns by framework, and exportable audit reports.

### Foundry IQ — Agent Governance

Foundry IQ provides agent building, testing, and governance capabilities for Copilot extensions. In the context of Compliance Copilot:

- **Agent testing** — Validate that the compliance agent produces consistent, accurate reviews across a battery of test scenarios before deployment
- **Governance controls** — Enforce guardrails on agent behavior (e.g., prevent the agent from modifying code, restrict tool access to read-only operations)
- **Usage analytics** — Track agent invocation patterns, token consumption, and tool call frequency across the organization

### Azure Services

| Service | Purpose | Current State | Production Swap |
|---------|---------|---------------|-----------------|
| **Entra ID** | Service authentication, SSO | API key middleware | JWT validation via `@azure/identity` |
| **Key Vault** | Secrets management | Environment variables | `@azure/keyvault-secrets` SDK |
| **Purview** | Data classification (PII, PHI, financial) | In-process pattern matching | Purview REST API for catalog-grade classification |
| **Monitor** | Telemetry, alerting, dashboards | Console logging | Application Insights SDK with custom metrics |
| **Container Apps** | Deployment, scaling, revision management | Docker Compose | Azure CLI / Bicep deployment |
| **Defender for Cloud** | Security posture, vulnerability scanning | — | Pull Defender recommendations as review context |
| **Azure OpenAI Service** | LLM inference for Copilot SDK agent | GitHub Copilot backend | Azure OpenAI GPT-4o via BYOK config |
| **Azure Policy** | Regulatory compliance initiatives | — | Consume Azure Policy compliance state per-subscription |
| **Event Grid** | Async event routing at scale | Direct webhook → Express | Webhook → Event Grid → Container Apps for fan-out |

### Integration Maturity

```
┌─────────────────────┬───────────────┬──────────────────────────────┐
│ Service             │ Demo State    │ Production Path              │
├─────────────────────┼───────────────┼──────────────────────────────┤
│ Agent 365           │ Documented    │ Register via Admin Center    │
│ Work IQ             │ Mock server   │ Point WORK_IQ_URL to SaaS   │
│ Fabric IQ           │ Mock server   │ Point FABRIC_IQ_URL to SaaS │
│ Foundry IQ          │ Documented    │ Agent governance SDK         │
│ Entra ID            │ API key stub  │ @azure/identity JWT          │
│ Key Vault           │ Env vars      │ @azure/keyvault-secrets      │
│ Purview             │ Regex patterns│ Purview REST API             │
│ Monitor             │ Console.log   │ Application Insights SDK     │
│ Defender for Cloud  │ Documented    │ Defender API enrichment      │
│ Azure OpenAI        │ BYOK config   │ Azure OpenAI endpoint        │
│ Azure Policy        │ Documented    │ Policy compliance API        │
│ Event Grid          │ Documented    │ Event Grid topic + sub       │
│ GitHub Actions      │ Documented    │ Workflow YAML in repo        │
└─────────────────────┴───────────────┴──────────────────────────────┘
```

**Implemented + runnable:** Work IQ, Fabric IQ, Entra ID, Key Vault, Purview, Monitor, Azure OpenAI (BYOK), Container Apps

**Documented with clear production path:** Agent 365, Foundry IQ, Defender for Cloud, Azure Policy, Event Grid, GitHub Actions

### Swapping Mocks to Production

**Work IQ and Fabric IQ:** Set `WORK_IQ_URL` and `FABRIC_IQ_URL` environment variables to the real SaaS endpoints. No code changes required — the HTTP client contracts are identical.

**Azure services:** Set Azure environment variables (see `env.example`) and replace `azure-mocks.ts` imports with the corresponding Azure SDK calls (`@azure/identity`, `@azure/keyvault-secrets`, `applicationinsights`).

## CI/CD with GitHub Actions

The recommended production pipeline uses GitHub Actions for continuous integration and Azure Container Apps for deployment:

```
PR opened → GitHub Actions workflow triggers:
  1. npm ci + tsc --noEmit (type check)
  2. npm test (unit + integration)
  3. docker build --target app (build production image)
  4. az containerapp update (deploy to staging)
  5. Compliance Copilot reviews its own PR (dogfooding)
```

This creates a self-reinforcing loop: the Compliance Copilot reviews every PR — including changes to itself.

## Docker Architecture

The Dockerfile uses multi-stage builds to produce separate images:

- **`app` target** — The Compliance Copilot agent. Contains only the Express server, agent code, and integration clients. This is what you deploy.
- **`mocks` target** — Work IQ and Fabric IQ mock servers. Used only for local development and demos.

```yaml
# docker-compose.yml
compliance-copilot:    # builds target: app
work-iq:               # builds target: mocks (different CMD)
fabric-iq:             # builds target: mocks (different CMD)
```

## Data Flow

```
1. GitHub sends webhook (PR opened/updated)
      ↓ (production: via Event Grid for reliable delivery)
2. Express server verifies HMAC-SHA256 signature
      ↓
3. Agent creates Copilot SDK session with compliance system prompt
      ↓ (LLM inference via GitHub Copilot or Azure OpenAI)
4. Agent calls tools autonomously:
   a. fetch_pr_diff → reads changed files (GitHub API)
   b. classify_sensitive_data → identifies PII/PHI (Purview patterns)
   c. query_compliance_policies → gets applicable controls (Work IQ)
   d. get_org_exceptions → checks for approved exceptions (Work IQ)
   e. store_audit_record → records findings (Fabric IQ)
      ↓
5. Agent returns structured JSON review
      ↓
6. Server formats review as markdown comment
      ↓
7. Comment posted to PR via GitHub API
8. Dashboard updated with new audit record (Fabric IQ)
9. Telemetry emitted (Azure Monitor / Application Insights)
```

## Security Model

- **Webhook verification**: HMAC-SHA256 signature validation on all incoming webhooks
- **API authentication**: API key middleware (Entra ID JWT in production)
- **Secrets management**: Environment variables (Key Vault in production)
- **Least privilege**: GitHub token scoped to minimum required permissions
- **Audit trail**: All reviews recorded in Fabric IQ with full context
- **Security posture**: Defender for Cloud monitors the Container Apps environment for vulnerabilities and misconfigurations
- **Agent governance**: Agent 365 provides IT-defined guardrails, access governance, and runtime defense (prompt injection, data exfiltration) for the Compliance Copilot agent

## Scaling Considerations

For multi-repo / multi-org deployments:
- **Horizontal scaling**: Stateless Express server scales via Container Apps replicas
- **Async ingestion**: Event Grid absorbs webhook bursts and delivers to Container Apps workers
- **Policy versioning**: Work IQ supports versioned policy packs per organization
- **Exception governance**: Org-level exceptions with approval workflow and expiration dates
- **Dashboard federation**: Fabric IQ aggregates across repos with org-level filtering
- **Multi-region**: Azure Container Apps supports multi-region deployment for global teams
