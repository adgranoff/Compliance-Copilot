export interface Finding {
  severity: "blocking" | "warning" | "info" | "compliant";
  framework: string;
  control_id: string;
  control_name: string;
  file?: string;
  line?: number;
  description: string;
  remediation: string;
}

export interface ComplianceReview {
  score: number;
  summary: string;
  findings: Finding[];
  frameworks_checked: string[];
  files_reviewed: number;
  sensitive_data_detected: boolean;
}

function severityIcon(severity: string): string {
  switch (severity) {
    case "blocking":
      return "\u{1F6D1}";
    case "warning":
      return "\u26A0\uFE0F";
    case "info":
      return "\u2139\uFE0F";
    case "compliant":
      return "\u2705";
    default:
      return "\u2753";
  }
}

function scoreColor(score: number): string {
  if (score >= 90) return "\u{1F7E2}";
  if (score >= 70) return "\u{1F7E1}";
  return "\u{1F534}";
}

function frameworkBadge(framework: string): string {
  switch (framework.toLowerCase()) {
    case "soc2":
      return "`SOC 2`";
    case "hipaa":
      return "`HIPAA`";
    case "pci-dss":
      return "`PCI-DSS`";
    default:
      return `\`${framework}\``;
  }
}

export function formatReviewComment(review: ComplianceReview): string {
  const blocking = review.findings.filter((f) => f.severity === "blocking");
  const warnings = review.findings.filter((f) => f.severity === "warning");
  const info = review.findings.filter((f) => f.severity === "info");
  const compliant = review.findings.filter((f) => f.severity === "compliant");

  let comment = `## ${scoreColor(review.score)} Compliance Review — Score: ${review.score}/100\n\n`;
  comment += `> ${review.summary}\n\n`;

  // Stats bar
  comment += `| Metric | Value |\n|--------|-------|\n`;
  comment += `| Frameworks Checked | ${review.frameworks_checked.map(frameworkBadge).join(" ")} |\n`;
  comment += `| Files Reviewed | ${review.files_reviewed} |\n`;
  comment += `| Sensitive Data Detected | ${review.sensitive_data_detected ? "Yes \u26A0\uFE0F" : "No"} |\n`;
  comment += `| Blocking Issues | ${blocking.length} |\n`;
  comment += `| Warnings | ${warnings.length} |\n\n`;

  // Blocking findings
  if (blocking.length > 0) {
    comment += `### \u{1F6D1} Blocking Issues (${blocking.length})\n\n`;
    comment += `> These must be resolved before merge.\n\n`;
    for (const f of blocking) {
      comment += formatFinding(f);
    }
  }

  // Warnings
  if (warnings.length > 0) {
    comment += `### \u26A0\uFE0F Warnings (${warnings.length})\n\n`;
    for (const f of warnings) {
      comment += formatFinding(f);
    }
  }

  // Info
  if (info.length > 0) {
    comment += `<details>\n<summary>\u2139\uFE0F Informational (${info.length})</summary>\n\n`;
    for (const f of info) {
      comment += formatFinding(f);
    }
    comment += `</details>\n\n`;
  }

  // Compliant
  if (compliant.length > 0) {
    comment += `<details>\n<summary>\u2705 Compliant Practices (${compliant.length})</summary>\n\n`;
    for (const f of compliant) {
      comment += `- ${frameworkBadge(f.framework)} **${f.control_id}**: ${f.description}\n`;
    }
    comment += `\n</details>\n\n`;
  }

  comment += `---\n`;
  comment += `*Reviewed by [Compliance Copilot](https://github.com/adgranoff/Compliance-Copilot) — Powered by GitHub Copilot SDK + Work IQ + Fabric IQ*\n`;

  return comment;
}

function formatFinding(f: Finding): string {
  let out = `#### ${severityIcon(f.severity)} ${frameworkBadge(f.framework)} ${f.control_id} — ${f.control_name}\n\n`;
  if (f.file) {
    out += `**File:** \`${f.file}\``;
    if (f.line) out += ` (line ${f.line})`;
    out += `\n\n`;
  }
  out += `${f.description}\n\n`;
  out += `> **Remediation:** ${f.remediation}\n\n`;
  return out;
}
