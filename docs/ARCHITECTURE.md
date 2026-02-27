# Architecture

## System Overview

Compliance Copilot is a **single deployable agent** that integrates with two external SaaS platforms and multiple Azure services:

```
                    ┌──────────────────┐
                    │     GitHub       │
                    │  (webhooks, API) │
                    └────────┬─────────┘
                             │
                ┌────────────▼────────────┐
                │   Compliance Copilot    │
                │   (Express + Copilot    │
                │    SDK Agent)           │
                │                         │
                │   Azure Container Apps  │
                └──┬──────────┬────────┬──┘
                   │          │        │
          ┌────────▼───┐ ┌───▼──────┐ ├──────────────────┐
          │  Work IQ   │ │ Fabric IQ│ │  Azure Services   │
          │  (SaaS)    │ │ (SaaS)   │ │  ┌─────────────┐  │
          │            │ │          │ │  │ Entra ID    │  │
          │ Policy     │ │ Audit    │ │  │ Key Vault   │  │
          │ management │ │ trail &  │ │  │ Purview     │  │
          │ & controls │ │ dashboard│ │  │ Monitor     │  │
          └────────────┘ └──────────┘ │  └─────────────┘  │
                                      └──────────────────┘
```

| Pillar | Role | Integration |
|--------|------|-------------|
| **GitHub Copilot SDK** | AI reasoning engine with custom tool execution | Embedded in the agent |
| **Work IQ** | Enterprise policy management (compliance controls, exceptions) | External SaaS — HTTP API via `WORK_IQ_URL` |
| **Fabric IQ** | Audit trail and compliance dashboard (review records, trends) | External SaaS — HTTP API via `FABRIC_IQ_URL` |

The Compliance Copilot is the only artifact you build and deploy. Work IQ and Fabric IQ are external services accessed over HTTP — the agent connects to them via URL configuration (`WORK_IQ_URL`, `FABRIC_IQ_URL`).

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

## External Service Integration

### Work IQ and Fabric IQ

Work IQ and Fabric IQ are **external SaaS platforms** — not components you deploy. The Compliance Copilot connects to them over HTTP, configured via environment variables:

| Service | Config | API Base |
|---------|--------|----------|
| Work IQ | `WORK_IQ_URL` | `/api/workiq/policies`, `/api/workiq/exceptions`, `/api/workiq/search` |
| Fabric IQ | `FABRIC_IQ_URL` | `/api/fabriciq/audit`, `/api/fabriciq/dashboard`, `/api/fabriciq/trends` |

For demo and local development, mock implementations (`mock-services/`) replicate the same API contracts as the production SaaS. These run as separate containers in Docker Compose and are **not** bundled into the Compliance Copilot image.

To switch from mocks to production: set `WORK_IQ_URL` and `FABRIC_IQ_URL` to the real SaaS endpoints. No code changes required.

### Azure Services

| Service | Purpose | Current State | Production Swap |
|---------|---------|---------------|-----------------|
| **Entra ID** | Service authentication, SSO | API key middleware | JWT validation via `@azure/identity` |
| **Key Vault** | Secrets management | Environment variables | `@azure/keyvault-secrets` SDK |
| **Purview** | Data classification | In-process pattern matching | Purview REST API |
| **Monitor** | Telemetry and alerting | Console logging | Application Insights SDK |
| **Container Apps** | Deployment and scaling | Docker Compose | Azure CLI / Bicep deployment |

To swap Azure mocks to production:

1. Set Azure environment variables (see `env.example`)
2. Replace `azure-mocks.ts` imports with Azure SDK calls

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
2. Express server verifies signature + routes to agent
3. Agent creates Copilot SDK session with compliance system prompt
4. Agent calls tools autonomously:
   a. fetch_pr_diff → reads changed files
   b. classify_sensitive_data → identifies PII/PHI
   c. query_compliance_policies → gets applicable controls (Work IQ)
   d. get_org_exceptions → checks for approved exceptions (Work IQ)
   e. store_audit_record → records findings (Fabric IQ)
5. Agent returns structured JSON review
6. Server formats review as markdown comment
7. Comment posted to PR via GitHub API
8. Dashboard updated with new audit record (Fabric IQ)
```

## Security Model

- **Webhook verification**: HMAC-SHA256 signature validation on all incoming webhooks
- **API authentication**: API key middleware (Entra ID JWT in production)
- **Secrets management**: Environment variables (Key Vault in production)
- **Least privilege**: GitHub token scoped to minimum required permissions
- **Audit trail**: All reviews recorded in Fabric IQ with full context

## Scaling Considerations

For multi-repo / multi-org deployments:
- **Horizontal scaling**: Stateless Express server scales via Container Apps replicas
- **Policy versioning**: Work IQ supports versioned policy packs per organization
- **Exception governance**: Org-level exceptions with approval workflow and expiration dates
- **Dashboard federation**: Fabric IQ aggregates across repos with org-level filtering
