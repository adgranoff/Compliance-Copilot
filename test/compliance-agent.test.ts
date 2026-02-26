import { describe, it, expect } from "vitest";
import {
  formatReviewComment,
  type ComplianceReview,
} from "../src/github/comment-formatter.js";

describe("comment formatter", () => {
  it("formats a review with blocking findings", () => {
    // given
    const review: ComplianceReview = {
      score: 55,
      summary: "Multiple compliance issues found",
      findings: [
        {
          severity: "blocking",
          framework: "soc2",
          control_id: "CC6.2",
          control_name: "Credential Management",
          file: "src/config.ts",
          line: 10,
          description: "Hardcoded API key",
          remediation: "Use environment variables",
        },
        {
          severity: "warning",
          framework: "hipaa",
          control_id: "§164.312(b)",
          control_name: "Audit Controls",
          file: "src/patient.ts",
          line: 25,
          description: "Missing audit logging",
          remediation: "Add audit trail",
        },
      ],
      frameworks_checked: ["soc2", "hipaa"],
      files_reviewed: 5,
      sensitive_data_detected: true,
    };

    // when
    const comment = formatReviewComment(review);

    // then
    expect(comment).toContain("55/100");
    expect(comment).toContain("Blocking Issues");
    expect(comment).toContain("CC6.2");
    expect(comment).toContain("Credential Management");
    expect(comment).toContain("src/config.ts");
    expect(comment).toContain("Warnings");
    expect(comment).toContain("§164.312(b)");
    expect(comment).toContain("Compliance Copilot");
  });

  it("formats a clean review", () => {
    // given
    const review: ComplianceReview = {
      score: 100,
      summary: "No compliance issues found",
      findings: [
        {
          severity: "compliant",
          framework: "soc2",
          control_id: "CC6.1",
          control_name: "Logical Access Controls",
          description: "Authentication properly implemented",
          remediation: "",
        },
      ],
      frameworks_checked: ["soc2", "hipaa"],
      files_reviewed: 3,
      sensitive_data_detected: false,
    };

    // when
    const comment = formatReviewComment(review);

    // then
    expect(comment).toContain("100/100");
    // Stats table always shows "Blocking Issues | 0" — but no findings section
    expect(comment).toContain("Blocking Issues | 0");
    expect(comment).not.toContain("must be resolved before merge");
    expect(comment).toContain("Compliant Practices");
  });

  it("includes all framework badges", () => {
    // given
    const review: ComplianceReview = {
      score: 85,
      summary: "Minor issues",
      findings: [],
      frameworks_checked: ["soc2", "hipaa"],
      files_reviewed: 2,
      sensitive_data_detected: false,
    };

    // when
    const comment = formatReviewComment(review);

    // then
    expect(comment).toContain("`SOC 2`");
    expect(comment).toContain("`HIPAA`");
  });
});
