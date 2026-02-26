export interface ComplianceControl {
  id: string;
  name: string;
  description: string;
  framework: "soc2" | "hipaa";
  category: string;
  severity: "high" | "medium" | "low";
  checkPatterns: string[];
}

export const soc2Controls: ComplianceControl[] = [
  {
    id: "CC6.1",
    name: "Logical Access Controls",
    description:
      "Systems are protected against unauthorized access through logical access security measures",
    framework: "soc2",
    category: "Access Control",
    severity: "high",
    checkPatterns: [
      "authentication",
      "authorization",
      "access_control",
      "login",
      "session",
      "jwt",
      "oauth",
      "rbac",
    ],
  },
  {
    id: "CC6.2",
    name: "Credential Management",
    description:
      "Credentials for protected information assets are created, managed, and protected appropriately",
    framework: "soc2",
    category: "Access Control",
    severity: "high",
    checkPatterns: [
      "password",
      "secret",
      "api_key",
      "credential",
      "token",
      "private_key",
      "connection_string",
    ],
  },
  {
    id: "CC6.3",
    name: "Access Restriction",
    description:
      "Access to systems and data is restricted based on need and principle of least privilege",
    framework: "soc2",
    category: "Access Control",
    severity: "medium",
    checkPatterns: [
      "permission",
      "role",
      "privilege",
      "admin",
      "superuser",
      "root",
    ],
  },
  {
    id: "CC6.6",
    name: "External Threat Protection",
    description:
      "Systems are protected against threats from external sources",
    framework: "soc2",
    category: "Security",
    severity: "high",
    checkPatterns: [
      "sql",
      "injection",
      "xss",
      "csrf",
      "sanitize",
      "validate",
      "escape",
      "parameterize",
    ],
  },
  {
    id: "CC6.7",
    name: "Data Transmission Security",
    description:
      "Data is protected during transmission using encryption and secure protocols",
    framework: "soc2",
    category: "Encryption",
    severity: "high",
    checkPatterns: [
      "http://",
      "tls",
      "ssl",
      "encrypt",
      "https",
      "certificate",
    ],
  },
  {
    id: "CC6.8",
    name: "Malicious Software Prevention",
    description: "Systems are protected against malicious software",
    framework: "soc2",
    category: "Security",
    severity: "medium",
    checkPatterns: ["eval", "exec", "child_process", "spawn", "shell"],
  },
  {
    id: "CC7.1",
    name: "Security Monitoring",
    description:
      "Systems are monitored for anomalies that indicate security events",
    framework: "soc2",
    category: "Monitoring",
    severity: "medium",
    checkPatterns: [
      "log",
      "audit",
      "monitor",
      "alert",
      "trace",
      "telemetry",
    ],
  },
  {
    id: "CC7.2",
    name: "Activity Monitoring",
    description:
      "Security events are identified and logged for analysis",
    framework: "soc2",
    category: "Monitoring",
    severity: "medium",
    checkPatterns: [
      "event_log",
      "security_event",
      "access_log",
      "audit_trail",
    ],
  },
  {
    id: "CC8.1",
    name: "Change Management",
    description:
      "Changes to infrastructure and software are authorized, designed, developed, and implemented in a controlled manner",
    framework: "soc2",
    category: "Change Management",
    severity: "medium",
    checkPatterns: [
      "migration",
      "schema",
      "deploy",
      "config_change",
      "feature_flag",
    ],
  },
];

export const hipaaControls: ComplianceControl[] = [
  {
    id: "§164.312(a)(1)",
    name: "Access Control",
    description:
      "Implement technical policies and procedures for electronic information systems that maintain ePHI",
    framework: "hipaa",
    category: "Technical Safeguards",
    severity: "high",
    checkPatterns: [
      "patient",
      "health",
      "medical",
      "diagnosis",
      "treatment",
      "phi",
      "ephi",
      "hipaa",
    ],
  },
  {
    id: "§164.312(b)",
    name: "Audit Controls",
    description:
      "Implement mechanisms to record and examine activity in systems that contain or use ePHI",
    framework: "hipaa",
    category: "Technical Safeguards",
    severity: "high",
    checkPatterns: [
      "audit",
      "log",
      "record",
      "examine",
      "activity",
      "access_log",
    ],
  },
  {
    id: "§164.312(c)(1)",
    name: "Integrity Controls",
    description:
      "Implement policies and procedures to protect ePHI from improper alteration or destruction",
    framework: "hipaa",
    category: "Technical Safeguards",
    severity: "high",
    checkPatterns: [
      "checksum",
      "hash",
      "integrity",
      "validate",
      "verify",
      "tamper",
    ],
  },
  {
    id: "§164.312(d)",
    name: "Person or Entity Authentication",
    description:
      "Implement procedures to verify that a person or entity seeking access to ePHI is who they claim to be",
    framework: "hipaa",
    category: "Technical Safeguards",
    severity: "high",
    checkPatterns: [
      "authenticate",
      "identity",
      "verify",
      "mfa",
      "two_factor",
      "biometric",
    ],
  },
  {
    id: "§164.312(e)(1)",
    name: "Transmission Security",
    description:
      "Implement technical security measures to guard against unauthorized access to ePHI during transmission",
    framework: "hipaa",
    category: "Technical Safeguards",
    severity: "high",
    checkPatterns: [
      "encrypt",
      "tls",
      "ssl",
      "https",
      "transport",
      "transmission",
    ],
  },
  {
    id: "§164.308(a)(5)",
    name: "Security Awareness and Training",
    description:
      "Security awareness and training program for all workforce members",
    framework: "hipaa",
    category: "Administrative Safeguards",
    severity: "medium",
    checkPatterns: [
      "password_policy",
      "login_monitoring",
      "security_reminder",
    ],
  },
  {
    id: "§164.308(a)(1)",
    name: "Risk Analysis",
    description:
      "Conduct an accurate and thorough assessment of potential risks and vulnerabilities to ePHI",
    framework: "hipaa",
    category: "Administrative Safeguards",
    severity: "high",
    checkPatterns: [
      "risk",
      "vulnerability",
      "threat",
      "assessment",
      "impact",
    ],
  },
];

export const allControls: ComplianceControl[] = [
  ...soc2Controls,
  ...hipaaControls,
];

export function getControlsByFramework(
  framework: "soc2" | "hipaa",
): ComplianceControl[] {
  return framework === "soc2" ? soc2Controls : hipaaControls;
}

export function getControlById(id: string): ComplianceControl | undefined {
  return allControls.find((c) => c.id === id);
}
