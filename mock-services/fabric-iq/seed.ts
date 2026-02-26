export interface SeedReview {
  id: string;
  timestamp: string;
  pr_number: number;
  repo: string;
  score: number;
  findings_count: number;
  blocking_count: number;
  warning_count: number;
  frameworks_checked: string[];
  sensitive_data_detected: boolean;
  findings: Array<{
    severity: string;
    framework: string;
    control_id: string;
    description: string;
  }>;
}

const repos = [
  "acme-corp/patient-portal",
  "acme-corp/billing-service",
  "acme-corp/auth-service",
  "acme-corp/data-pipeline",
  "acme-corp/api-gateway",
];

const findingTemplates = [
  { severity: "blocking", framework: "soc2", control_id: "CC6.2", description: "Hardcoded API key found in configuration file" },
  { severity: "blocking", framework: "hipaa", control_id: "§164.312(a)(1)", description: "Patient records accessed without authentication check" },
  { severity: "blocking", framework: "soc2", control_id: "CC6.6", description: "SQL injection vulnerability in search endpoint" },
  { severity: "warning", framework: "soc2", control_id: "CC6.7", description: "HTTP URL used for external API call" },
  { severity: "warning", framework: "hipaa", control_id: "§164.312(b)", description: "Missing audit logging for PHI access" },
  { severity: "warning", framework: "soc2", control_id: "CC7.1", description: "Empty catch block in error handler" },
  { severity: "warning", framework: "hipaa", control_id: "§164.312(e)(1)", description: "ePHI transmitted without explicit encryption verification" },
  { severity: "info", framework: "soc2", control_id: "CC6.1", description: "API endpoint handles user data — verify auth middleware" },
  { severity: "info", framework: "soc2", control_id: "CC8.1", description: "Database migration detected — ensure reversibility" },
  { severity: "compliant", framework: "soc2", control_id: "CC6.2", description: "Secrets loaded from environment variables" },
  { severity: "compliant", framework: "hipaa", control_id: "§164.312(d)", description: "Multi-factor authentication properly implemented" },
  { severity: "compliant", framework: "soc2", control_id: "CC7.1", description: "Structured logging with appropriate context" },
];

export function generateSeedData(): SeedReview[] {
  const reviews: SeedReview[] = [];
  const now = Date.now();

  for (let i = 0; i < 25; i++) {
    const daysAgo = Math.floor(Math.random() * 60);
    const timestamp = new Date(now - daysAgo * 86400000).toISOString();
    const repo = repos[Math.floor(Math.random() * repos.length)];
    const prNum = 100 + Math.floor(Math.random() * 400);

    // Pick random findings
    const numFindings = 2 + Math.floor(Math.random() * 5);
    const shuffled = [...findingTemplates].sort(() => Math.random() - 0.5);
    const findings = shuffled.slice(0, numFindings);

    const blocking = findings.filter((f) => f.severity === "blocking").length;
    const warnings = findings.filter((f) => f.severity === "warning").length;
    const score = Math.max(0, 100 - blocking * 15 - warnings * 5);

    reviews.push({
      id: `review-${String(i + 1).padStart(3, "0")}`,
      timestamp,
      pr_number: prNum,
      repo,
      score,
      findings_count: findings.length,
      blocking_count: blocking,
      warning_count: warnings,
      frameworks_checked: [...new Set(findings.map((f) => f.framework))],
      sensitive_data_detected: findings.some(
        (f) =>
          f.description.toLowerCase().includes("patient") ||
          f.description.toLowerCase().includes("phi"),
      ),
      findings,
    });
  }

  return reviews.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}
