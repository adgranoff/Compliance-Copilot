/**
 * In-process Azure service mocks.
 * These simulate Azure Purview, Entra ID, Key Vault, and Monitor
 * for the demo. In production, these would be replaced with real
 * Azure SDK calls.
 */

export interface DataClassification {
  label: string;
  confidence: number;
  category: "PII" | "PHI" | "Financial" | "Public" | "Internal";
}

export interface AuthValidation {
  valid: boolean;
  principal?: string;
  roles?: string[];
}

// --- Azure Purview (Data Classification) ---

const classificationRules: Array<{
  pattern: RegExp;
  label: string;
  category: DataClassification["category"];
}> = [
  { pattern: /ssn|social.?security/i, label: "US Social Security Number", category: "PII" },
  { pattern: /patient|diagnosis|medical|treatment|prescription/i, label: "Protected Health Information", category: "PHI" },
  { pattern: /credit.?card|card.?number|cvv|expir/i, label: "Payment Card Data", category: "Financial" },
  { pattern: /email|phone|address|birth/i, label: "Personal Contact Info", category: "PII" },
  { pattern: /insurance|claim|member.?id|policy/i, label: "Health Insurance Data", category: "PHI" },
];

export function classifyData(content: string): DataClassification[] {
  const results: DataClassification[] = [];
  for (const rule of classificationRules) {
    if (rule.pattern.test(content)) {
      results.push({
        label: rule.label,
        confidence: 0.95,
        category: rule.category,
      });
    }
  }
  return results;
}

// --- Azure Entra ID (Authentication) ---

export function validateApiKey(apiKey: string | undefined): AuthValidation {
  if (!apiKey) return { valid: false };
  // In production: validate JWT against Entra ID
  // For demo: accept any non-empty key
  return {
    valid: true,
    principal: "compliance-copilot-service",
    roles: ["compliance.read", "compliance.write", "audit.write"],
  };
}

// --- Azure Key Vault (Secrets) ---

const secretStore: Record<string, string> = {
  "github-token": process.env.GITHUB_TOKEN || "",
  "webhook-secret": process.env.GITHUB_WEBHOOK_SECRET || "",
};

export function getSecret(name: string): string | undefined {
  // In production: await secretClient.getSecret(name)
  return secretStore[name];
}

// --- Azure Monitor (Telemetry) ---

export interface TelemetryEvent {
  name: string;
  properties: Record<string, string>;
  measurements: Record<string, number>;
  timestamp: string;
}

const telemetryBuffer: TelemetryEvent[] = [];

export function trackEvent(
  name: string,
  properties: Record<string, string> = {},
  measurements: Record<string, number> = {},
): void {
  const event: TelemetryEvent = {
    name,
    properties,
    measurements,
    timestamp: new Date().toISOString(),
  };
  telemetryBuffer.push(event);
  // In production: appInsightsClient.trackEvent(event)
  console.log(`[Azure Monitor] ${name}`, properties);
}

export function getTelemetry(): TelemetryEvent[] {
  return [...telemetryBuffer];
}
