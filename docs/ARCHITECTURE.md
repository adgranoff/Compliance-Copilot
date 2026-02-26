# Architecture

## System Overview

Compliance Copilot is built on three pillars:

1. **GitHub Copilot SDK** — Provides the AI reasoning engine with custom tool execution
2. **Work IQ** — Enterprise policy management (organizational compliance controls, exceptions)
3. **Fabric IQ** — Audit trail and compliance dashboard (review records, trends, reporting)

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
- **work-iq-client.ts** — HTTP client for Work IQ policy API
- **fabric-iq-client.ts** — HTTP client for Fabric IQ audit API
- **azure-mocks.ts** — In-process stubs for Azure Purview (data classification), Entra ID (authentication), Key Vault (secrets), and Monitor (telemetry)

## Azure Integration Architecture

### Production Deployment on Azure

```
┌─────────────────────────────────────────────────────┐
│                 Azure Container Apps                 │
│  ┌──────────────┐  ┌────────────┐  ┌─────────────┐ │
│  │ Compliance    │  │ Work IQ    │  │ Fabric IQ   │ │
│  │ Copilot       │  │ Service    │  │ Service     │ │
│  │ (main agent)  │  │ (policies) │  │ (audit)     │ │
│  └──────┬───────┘  └─────┬──────┘  └──────┬──────┘ │
│         │                │                 │         │
└─────────┼────────────────┼─────────────────┼─────────┘
          │                │                 │
    ┌─────┴──────┐   ┌────┴─────┐    ┌─────┴──────┐
    │ Entra ID   │   │ Azure    │    │ Azure      │
    │ (auth/SSO) │   │ Key Vault│    │ Monitor    │
    └────────────┘   │ (secrets)│    │ (telemetry)│
                     └──────────┘    └────────────┘
                           │
                     ┌─────┴──────┐
                     │ Azure      │
                     │ Purview    │
                     │ (data      │
                     │  classify) │
                     └────────────┘
```

### Azure Services Used

| Service | Purpose | Current State | Production Swap |
|---------|---------|---------------|-----------------|
| **Entra ID** | Service authentication, SSO | API key middleware | JWT validation via `@azure/identity` |
| **Key Vault** | Secrets management | Environment variables | `@azure/keyvault-secrets` SDK |
| **Purview** | Data classification | In-process pattern matching | Purview REST API |
| **Monitor** | Telemetry and alerting | Console logging | Application Insights SDK |
| **Container Apps** | Deployment and scaling | Docker Compose | Azure CLI / Bicep deployment |

### Mock vs. Production API Contracts

All mock services implement the same API contracts as the production services. To swap to production:

1. Set Azure environment variables (see `env.example`)
2. Replace `azure-mocks.ts` imports with Azure SDK calls
3. Point `WORK_IQ_URL` and `FABRIC_IQ_URL` to production endpoints

## Data Flow

```
1. GitHub sends webhook (PR opened/updated)
2. Express server verifies signature + routes to agent
3. Agent creates Copilot SDK session with compliance system prompt
4. Agent calls tools autonomously:
   a. fetch_pr_diff → reads changed files
   b. classify_sensitive_data → identifies PII/PHI
   c. query_compliance_policies → gets applicable controls
   d. get_org_exceptions → checks for approved exceptions
   e. store_audit_record → records findings in Fabric IQ
5. Agent returns structured JSON review
6. Server formats review as markdown comment
7. Comment posted to PR via GitHub API
8. Dashboard updated with new audit record
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
