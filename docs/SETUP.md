# Setup Guide

## Prerequisites

- **Node.js 20+** — [Download](https://nodejs.org/)
- **GitHub Copilot CLI** — Install and authenticate:
  ```bash
  # Install Copilot CLI
  npm install -g @github/copilot-cli

  # Authenticate
  copilot auth
  ```
- **GitHub Personal Access Token** — Create at [github.com/settings/tokens](https://github.com/settings/tokens) with `repo` scope
- **Docker** (optional) — For containerized deployment

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/adgranoff/Compliance-Copilot.git
cd Compliance-Copilot
npm install
```

### 2. Configure Environment

```bash
cp env.example .env
```

Edit `.env` with your credentials:
```
GITHUB_TOKEN=ghp_your_token_here
GITHUB_WEBHOOK_SECRET=your_webhook_secret
```

### 3. Start Services

**Option A: Development mode (all services)**
```bash
npm run dev:all
```

**Option B: Individual services**
```bash
# Terminal 1: Main server
npm run dev

# Terminal 2: Work IQ mock
npm run mock:workiq

# Terminal 3: Fabric IQ mock
npm run mock:fabriciq
```

**Option C: Docker**
```bash
docker-compose up --build
```

### 4. Verify

```bash
# Health check
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3002/health

# Open dashboard
open http://localhost:3002/dashboard
```

## GitHub Webhook Setup

1. Go to your repository → Settings → Webhooks → Add webhook
2. **Payload URL:** `https://your-server.com/webhook`
3. **Content type:** `application/json`
4. **Secret:** Same value as `GITHUB_WEBHOOK_SECRET`
5. **Events:** Select "Pull requests"

For local development, use [smee.io](https://smee.io) or [ngrok](https://ngrok.com) to tunnel webhooks.

## Manual Testing

Trigger a review without webhooks:
```bash
curl -X POST http://localhost:3000/review \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "adgranoff",
    "repo": "Compliance-Copilot",
    "pullNumber": 1
  }'
```

## BYOK (Bring Your Own Key)

If Copilot CLI is not available, use Azure OpenAI or OpenAI directly:

```env
COPILOT_MODEL=gpt-4o
COPILOT_PROVIDER_BASE_URL=https://your-resource.openai.azure.com
COPILOT_PROVIDER_API_KEY=your_azure_openai_key
```

## Production Deployment (Azure Container Apps)

```bash
# Login to Azure
az login

# Create resource group
az group create --name compliance-copilot-rg --location eastus

# Deploy Container Apps
az containerapp compose create \
  --resource-group compliance-copilot-rg \
  --environment compliance-copilot-env \
  --compose-file-path docker-compose.yml
```

### Azure Services Configuration

| Service | Configuration |
|---------|--------------|
| Agent 365 | Register the agent in Microsoft Admin Center with an Entra Agent ID |
| Entra ID | Set `AZURE_TENANT_ID` and `AZURE_CLIENT_ID` |
| Key Vault | Set `AZURE_KEY_VAULT_URL`, store secrets in vault |
| Monitor | Set `AZURE_MONITOR_CONNECTION_STRING` |
| Purview | Configure data catalog for PHI/PII classification |
| Defender | Enable Defender for Cloud on the Container Apps environment |

## Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Type check
npx tsc --noEmit
```
