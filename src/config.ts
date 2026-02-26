import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: process.env.NODE_ENV || "development",

  github: {
    token: process.env.GITHUB_TOKEN || "",
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || "",
  },

  services: {
    workIqUrl: process.env.WORK_IQ_URL || "http://localhost:3001",
    fabricIqUrl: process.env.FABRIC_IQ_URL || "http://localhost:3002",
  },

  azure: {
    tenantId: process.env.AZURE_TENANT_ID,
    clientId: process.env.AZURE_CLIENT_ID,
    keyVaultUrl: process.env.AZURE_KEY_VAULT_URL,
    monitorConnectionString: process.env.AZURE_MONITOR_CONNECTION_STRING,
  },

  copilot: {
    model: process.env.COPILOT_MODEL,
    providerBaseUrl: process.env.COPILOT_PROVIDER_BASE_URL,
    providerApiKey: process.env.COPILOT_PROVIDER_API_KEY,
  },
} as const;
