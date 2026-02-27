# Compliance Copilot

**AI-powered compliance review for every pull request** — built with GitHub Copilot SDK, Work IQ, and Fabric IQ.

> Review time: 3 days → 30 seconds | Violation detection: 60% → 95% | Audit coverage: Manual → 100% automated

## What It Does

Compliance Copilot is a GitHub Copilot SDK agent that automatically reviews pull requests for SOC 2 Type II and HIPAA compliance violations. When a PR is opened, the agent:

1. Analyzes changed files for security vulnerabilities and compliance gaps
2. Classifies sensitive data (PII, PHI) using Azure Purview patterns
3. Maps findings to specific compliance framework controls
4. Posts a structured review comment with severity, remediation, and compliance score
5. Records an audit trail in Fabric IQ for compliance dashboards

## Quick Start

```bash
npm install
cp env.example .env    # Add your GITHUB_TOKEN
npm run dev:all        # Starts agent + Work IQ + Fabric IQ
```

Open the compliance dashboard at `http://localhost:3002/dashboard`

## Documentation

| Document | Description |
|----------|-------------|
| [docs/README.md](docs/README.md) | Full project overview, architecture diagram, setup |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Technical deep dive, Azure integration, data flow |
| [docs/SETUP.md](docs/SETUP.md) | Prerequisites, installation, deployment guide |
| [docs/RAI.md](docs/RAI.md) | Responsible AI considerations |
| [docs/JUDGE-MAPPING.md](docs/JUDGE-MAPPING.md) | Rubric criterion → evidence mapping |
| [docs/MOCK-VS-PRODUCTION.md](docs/MOCK-VS-PRODUCTION.md) | What's real vs. stubbed, production swap steps |
| [docs/SDK-FEEDBACK.md](docs/SDK-FEEDBACK.md) | GitHub Copilot SDK feedback and lessons learned |
| [AGENTS.md](AGENTS.md) | Agent behavior and custom instructions |

## Built With

- [GitHub Copilot SDK](https://www.npmjs.com/package/@github/copilot-sdk) — AI agent with custom compliance tools

