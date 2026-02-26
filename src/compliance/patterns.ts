export interface PatternMatch {
  pattern: string;
  type: "sensitive_data" | "vulnerability" | "compliance_gap";
  severity: "blocking" | "warning" | "info";
  framework: "soc2" | "hipaa" | "both";
  controlId: string;
  description: string;
  remediation: string;
}

export const sensitiveDataPatterns: PatternMatch[] = [
  // PII Patterns
  {
    pattern: "\\bssn\\b|social.?security|\\bSSN\\b",
    type: "sensitive_data",
    severity: "blocking",
    framework: "both",
    controlId: "CC6.1",
    description: "Social Security Number handling detected",
    remediation:
      "Ensure SSN is encrypted at rest and in transit. Never log SSN values. Use tokenization where possible.",
  },
  {
    pattern: "\\bemail\\b.*=|user\\.email|customer\\.email",
    type: "sensitive_data",
    severity: "info",
    framework: "soc2",
    controlId: "CC6.1",
    description: "Email address handling detected",
    remediation: "Ensure PII handling follows data classification policy.",
  },
  {
    pattern:
      "date.?of.?birth|\\bdob\\b|birth.?date|patient.?age",
    type: "sensitive_data",
    severity: "warning",
    framework: "hipaa",
    controlId: "§164.312(a)(1)",
    description: "Date of birth / patient age handling detected (PHI)",
    remediation:
      "Apply HIPAA access controls. Ensure audit logging for all PHI access.",
  },
  // PHI Patterns
  {
    pattern:
      "diagnosis|medical.?record|patient.?id|health.?record|\\bphi\\b|\\bephi\\b|treatment.?plan|prescription",
    type: "sensitive_data",
    severity: "blocking",
    framework: "hipaa",
    controlId: "§164.312(a)(1)",
    description: "Protected Health Information (PHI) handling detected",
    remediation:
      "Apply full HIPAA technical safeguards: access control, audit logging, encryption, integrity checks.",
  },
  {
    pattern: "insurance.?id|member.?id|policy.?number|claim",
    type: "sensitive_data",
    severity: "warning",
    framework: "hipaa",
    controlId: "§164.312(a)(1)",
    description: "Health insurance information handling detected",
    remediation:
      "Ensure insurance data is treated as PHI with appropriate access controls and encryption.",
  },
];

export const vulnerabilityPatterns: PatternMatch[] = [
  // Hardcoded secrets
  {
    pattern:
      "(?:password|secret|api_key|apikey|token|private_key)\\s*[:=]\\s*['\"][^'\"]{8,}['\"]",
    type: "vulnerability",
    severity: "blocking",
    framework: "soc2",
    controlId: "CC6.2",
    description: "Hardcoded credential or secret detected",
    remediation:
      "Move secrets to environment variables or a secrets manager (e.g., Azure Key Vault). Never commit secrets to source control.",
  },
  // SQL Injection
  {
    pattern:
      "(?:SELECT|INSERT|UPDATE|DELETE|DROP).*\\$\\{|\\$\\{.*(?:SELECT|INSERT|UPDATE|DELETE|DROP)|query\\s*\\(\\s*[`'\"].*\\$\\{|string\\s+sql\\s*=.*\\+|`[^`]*(?:SELECT|INSERT|UPDATE|DELETE|DROP)[^`]*\\$\\{",
    type: "vulnerability",
    severity: "blocking",
    framework: "soc2",
    controlId: "CC6.6",
    description: "Potential SQL injection vulnerability",
    remediation:
      "Use parameterized queries or an ORM. Never concatenate user input into SQL strings.",
  },
  // XSS
  {
    pattern:
      "innerHTML\\s*=|dangerouslySetInnerHTML|document\\.write\\(|v-html\\s*=",
    type: "vulnerability",
    severity: "warning",
    framework: "soc2",
    controlId: "CC6.6",
    description: "Potential XSS vulnerability via unsafe HTML rendering",
    remediation:
      "Sanitize all user input before rendering. Use framework-provided safe rendering methods.",
  },
  // Unencrypted transmission
  {
    pattern: "http://(?!localhost|127\\.0\\.0\\.1|0\\.0\\.0\\.0)",
    type: "vulnerability",
    severity: "warning",
    framework: "both",
    controlId: "CC6.7",
    description: "Unencrypted HTTP URL detected (non-localhost)",
    remediation:
      "Use HTTPS for all external communications to ensure data encryption in transit.",
  },
  // Dangerous eval
  {
    pattern: "\\beval\\s*\\(|new\\s+Function\\s*\\(|setTimeout\\s*\\(\\s*['\"]",
    type: "vulnerability",
    severity: "blocking",
    framework: "soc2",
    controlId: "CC6.8",
    description: "Dynamic code execution detected (eval/Function)",
    remediation:
      "Avoid eval() and new Function(). Use safer alternatives like JSON.parse() or predefined logic.",
  },
  // Missing error handling
  {
    pattern: "catch\\s*\\(\\s*\\w*\\s*\\)\\s*\\{\\s*\\}",
    type: "compliance_gap",
    severity: "warning",
    framework: "soc2",
    controlId: "CC7.1",
    description: "Empty catch block suppresses errors silently",
    remediation:
      "Log all caught errors with context. Empty catch blocks hide security-relevant failures.",
  },
  // Console.log in production
  {
    pattern:
      "console\\.log\\(.*(?:password|secret|token|key|ssn|phi|patient)",
    type: "vulnerability",
    severity: "blocking",
    framework: "both",
    controlId: "CC7.1",
    description: "Sensitive data potentially logged to console",
    remediation:
      "Never log sensitive data. Use structured logging with data masking for production systems.",
  },
  // Missing auth checks
  {
    pattern:
      "app\\.(?:get|post|put|delete|patch)\\s*\\([^)]*(?:admin|user|patient|record)",
    type: "compliance_gap",
    severity: "info",
    framework: "soc2",
    controlId: "CC6.1",
    description:
      "API endpoint handling sensitive resources — verify authentication middleware is applied",
    remediation:
      "Ensure all endpoints accessing sensitive resources have authentication and authorization middleware.",
  },
];

export const allPatterns: PatternMatch[] = [
  ...sensitiveDataPatterns,
  ...vulnerabilityPatterns,
];

export function scanContent(
  content: string,
  filePath: string,
): PatternMatch[] {
  const matches: PatternMatch[] = [];
  for (const pattern of allPatterns) {
    const regex = new RegExp(pattern.pattern, "gi");
    if (regex.test(content)) {
      matches.push(pattern);
    }
  }
  return matches;
}
