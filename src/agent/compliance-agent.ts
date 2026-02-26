import { CopilotClient, defineTool, approveAll } from "@github/copilot-sdk";
import { z } from "zod";
import { config } from "../config.js";
import { SYSTEM_PROMPT } from "./system-prompt.js";
import { fetchPrDiff, postReviewComment } from "../github/pr-client.js";
import {
  formatReviewComment,
  type ComplianceReview,
} from "../github/comment-formatter.js";
import { scanContent } from "../compliance/patterns.js";
import {
  getControlsByFramework,
  allControls,
} from "../compliance/frameworks.js";
import * as workIq from "../integrations/work-iq-client.js";
import * as fabricIq from "../integrations/fabric-iq-client.js";
import { classifyData, trackEvent } from "../integrations/azure-mocks.js";

let client: CopilotClient | null = null;

function getClient(): CopilotClient {
  if (!client) {
    client = new CopilotClient({
      logLevel: config.nodeEnv === "development" ? "info" : "error",
    });
  }
  return client;
}

function getProviderConfig():
  | { type: "openai"; baseUrl: string; apiKey: string }
  | undefined {
  if (config.copilot.providerBaseUrl && config.copilot.providerApiKey) {
    return {
      type: "openai",
      baseUrl: config.copilot.providerBaseUrl,
      apiKey: config.copilot.providerApiKey,
    };
  }
  return undefined;
}

const tools = [
  defineTool("fetch_pr_diff", {
    description: "Fetch the diff and changed files for a GitHub pull request",
    parameters: z.object({
      owner: z.string().describe("Repository owner"),
      repo: z.string().describe("Repository name"),
      pull_number: z.number().describe("Pull request number"),
    }),
    handler: async ({ owner, repo, pull_number }) => {
      console.log(`[Tool] fetch_pr_diff: ${owner}/${repo}#${pull_number}`);
      const diff = await fetchPrDiff(owner, repo, pull_number);
      trackEvent("tool.fetch_pr_diff", {
        repo: `${owner}/${repo}`,
        pr: String(pull_number),
      });
      return diff;
    },
  }),

  defineTool("query_compliance_policies", {
    description:
      "Query organizational compliance policies from Work IQ. Returns relevant controls for a framework.",
    parameters: z.object({
      framework: z
        .enum(["soc2", "hipaa"])
        .optional()
        .describe("Compliance framework to query"),
      search_query: z
        .string()
        .optional()
        .describe("Search query for specific policies"),
    }),
    handler: async ({ framework, search_query }) => {
      console.log(
        `[Tool] query_compliance_policies: framework=${framework}, query=${search_query}`,
      );

      try {
        if (search_query) {
          return await workIq.searchPolicies(search_query);
        }
        if (framework) {
          return await workIq.listPolicies(framework);
        }
        return await workIq.listPolicies();
      } catch {
        // Fallback to local controls if Work IQ is unreachable
        console.log("[Tool] Work IQ unreachable, using local controls");
        if (framework) {
          return getControlsByFramework(framework);
        }
        return allControls;
      }
    },
  }),

  defineTool("classify_sensitive_data", {
    description:
      "Classify whether code files handle sensitive data (PII, PHI, payment data) using Azure Purview patterns",
    parameters: z.object({
      file_paths: z.array(z.string()).describe("File paths to classify"),
      file_contents: z.array(z.string()).describe("File contents to analyze"),
    }),
    handler: async ({ file_paths, file_contents }) => {
      console.log(
        `[Tool] classify_sensitive_data: ${file_paths.length} files`,
      );

      const classifications = file_paths.map((path, i) => {
        const content = file_contents[i] || "";
        const azureClassifications = classifyData(content);
        const patternMatches = scanContent(content, path);
        return {
          file: path,
          azure_classifications: azureClassifications,
          pattern_matches: patternMatches.map((m) => ({
            type: m.type,
            severity: m.severity,
            framework: m.framework,
            controlId: m.controlId,
            description: m.description,
          })),
          has_sensitive_data:
            azureClassifications.length > 0 || patternMatches.length > 0,
        };
      });

      trackEvent("tool.classify_sensitive_data", {
        files_scanned: String(file_paths.length),
        sensitive_files: String(
          classifications.filter((c) => c.has_sensitive_data).length,
        ),
      });

      return { classifications };
    },
  }),

  defineTool("get_org_exceptions", {
    description:
      "Check if organizational exceptions exist for specific compliance controls",
    parameters: z.object({
      control_ids: z
        .array(z.string())
        .describe("Control IDs to check for exceptions"),
    }),
    handler: async ({ control_ids }) => {
      console.log(`[Tool] get_org_exceptions: ${control_ids.join(", ")}`);

      try {
        const exceptions = await workIq.getExceptions(control_ids);
        return { exceptions };
      } catch {
        console.log("[Tool] Work IQ unreachable, no exceptions available");
        return { exceptions: [] };
      }
    },
  }),

  defineTool("store_audit_record", {
    description:
      "Store a compliance review audit record in Fabric IQ for tracking and reporting",
    parameters: z.object({
      pr_number: z.number().describe("Pull request number"),
      repo: z.string().describe("Repository full name"),
      score: z
        .number()
        .describe("Compliance score (0-100)"),
      findings: z
        .array(
          z.object({
            severity: z.enum(["blocking", "warning", "info", "compliant"]),
            framework: z.string(),
            control_id: z.string(),
            description: z.string(),
          }),
        )
        .describe("List of compliance findings"),
    }),
    handler: async ({ pr_number, repo, score, findings }) => {
      console.log(
        `[Tool] store_audit_record: ${repo}#${pr_number} score=${score}`,
      );

      const record: fabricIq.AuditRecord = {
        pr_number,
        repo,
        score,
        findings_count: findings.length,
        blocking_count: findings.filter((f) => f.severity === "blocking")
          .length,
        warning_count: findings.filter((f) => f.severity === "warning").length,
        frameworks_checked: [
          ...new Set(findings.map((f) => f.framework)),
        ],
        sensitive_data_detected: findings.some(
          (f) =>
            f.description.toLowerCase().includes("phi") ||
            f.description.toLowerCase().includes("pii") ||
            f.description.toLowerCase().includes("sensitive"),
        ),
        findings,
      };

      try {
        const id = await fabricIq.storeAuditRecord(record);
        trackEvent("tool.store_audit_record", {
          repo,
          pr: String(pr_number),
          score: String(score),
        });
        return { recorded: true, id };
      } catch {
        console.log("[Tool] Fabric IQ unreachable, audit not stored");
        return { recorded: false, error: "Fabric IQ unavailable" };
      }
    },
  }),
];

export interface ReviewRequest {
  owner: string;
  repo: string;
  pullNumber: number;
  title: string;
  body: string;
}

export async function reviewPullRequest(request: ReviewRequest): Promise<void> {
  const { owner, repo, pullNumber, title, body } = request;
  const copilot = getClient();

  trackEvent("review.started", {
    repo: `${owner}/${repo}`,
    pr: String(pullNumber),
  });

  const session = await copilot.createSession({
    model: config.copilot.model || "gpt-4o",
    systemMessage: { mode: "replace", content: SYSTEM_PROMPT },
    tools,
    provider: getProviderConfig(),
    onPermissionRequest: approveAll,
  });

  try {
    const prompt = `Review pull request #${pullNumber} in ${owner}/${repo} for compliance violations.

PR Title: ${title}
PR Description: ${body || "(no description)"}

Please:
1. Fetch the PR diff
2. Classify any sensitive data in the changed files
3. Query relevant compliance policies
4. Check for any organizational exceptions if you find violations
5. Store the audit record
6. Return your structured compliance review as JSON`;

    const response = await session.sendAndWait(
      { prompt },
      120_000, // 2 minute timeout
    );

    const content = response?.data?.content || "";
    const review = parseReviewFromResponse(content, owner, repo, pullNumber);
    const comment = formatReviewComment(review);

    await postReviewComment(owner, repo, pullNumber, comment);

    trackEvent("review.completed", {
      repo: `${owner}/${repo}`,
      pr: String(pullNumber),
      score: String(review.score),
    });
  } finally {
    await session.destroy();
  }
}

function parseReviewFromResponse(
  content: string,
  owner: string,
  repo: string,
  pullNumber: number,
): ComplianceReview {
  // Try to extract JSON from the response
  const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]) as ComplianceReview;
    } catch {
      console.error("Failed to parse agent JSON response");
    }
  }

  // Try bare JSON
  const bareJsonMatch = content.match(/\{[\s\S]*"score"[\s\S]*"findings"[\s\S]*\}/);
  if (bareJsonMatch) {
    try {
      return JSON.parse(bareJsonMatch[0]) as ComplianceReview;
    } catch {
      console.error("Failed to parse bare JSON from response");
    }
  }

  // Fallback: return a generic review
  return {
    score: 50,
    summary: `Automated compliance review for ${owner}/${repo}#${pullNumber}. Agent response could not be parsed into structured format.`,
    findings: [
      {
        severity: "info",
        framework: "soc2",
        control_id: "CC8.1",
        control_name: "Change Management",
        description:
          "Review was completed but structured findings could not be extracted. Manual review recommended.",
        remediation: "Please review the PR manually for compliance issues.",
      },
    ],
    frameworks_checked: ["soc2", "hipaa"],
    files_reviewed: 0,
    sensitive_data_detected: false,
  };
}
