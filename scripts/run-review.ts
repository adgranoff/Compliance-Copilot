/**
 * Script to run a compliance review on a GitHub PR.
 * Usage: npx tsx scripts/run-review.ts <owner> <repo> <pr_number>
 */
import { Octokit } from "@octokit/rest";
import { CopilotClient, approveAll } from "@github/copilot-sdk";
import {
  formatReviewComment,
  type ComplianceReview,
  type Finding,
} from "../src/github/comment-formatter.js";

const owner = process.argv[2] || "adgranoff";
const repo = process.argv[3] || "Compliance-Copilot";
const pullNumber = parseInt(process.argv[4] || "1", 10);

// Try env, then dotenv, then git credential store
import dotenv from "dotenv";
dotenv.config();

let token = process.env.GITHUB_TOKEN || "";
if (!token || token.length < 30 || token.includes("your")) {
  // Read from git credential store
  const { execSync } = await import("child_process");
  try {
    const input = "protocol=https\nhost=github.com\n";
    const output = execSync("git credential fill", {
      encoding: "utf-8",
      input,
    });
    const match = output.match(/password=(.+)/);
    if (match) token = match[1].trim();
  } catch {
    console.error("No GitHub token available. Set GITHUB_TOKEN or configure git credentials.");
    process.exit(1);
  }
}
console.log(`Using token: ${token.slice(0, 4)}...${token.slice(-4)} (${token.length} chars)`);

const octokit = new Octokit({ auth: token });

console.log(`Reviewing PR #${pullNumber} in ${owner}/${repo}...`);

// 1. Fetch PR diff
const { data: files } = await octokit.pulls.listFiles({
  owner,
  repo,
  pull_number: pullNumber,
  per_page: 100,
});

const diffText = files
  .map(
    (f) =>
      `File: ${f.filename} (${f.status}, +${f.additions}/-${f.deletions})\n${f.patch || "(binary)"}`,
  )
  .join("\n\n");

console.log(`Found ${files.length} changed files`);

// 2. Get PR info
const { data: pr } = await octokit.pulls.get({
  owner,
  repo,
  pull_number: pullNumber,
});

// 3. Create Copilot session
const client = new CopilotClient({ logLevel: "error" });
await client.start();

const SYSTEM_PROMPT = `You are a senior compliance engineer reviewing pull requests for SOC 2 Type II and HIPAA compliance violations.

Analyze the code changes and respond with ONLY a valid JSON object (no markdown fences, no extra text before or after):
{
  "score": <number 0-100>,
  "summary": "<brief assessment>",
  "findings": [
    {
      "severity": "blocking" | "warning" | "info" | "compliant",
      "framework": "soc2" | "hipaa",
      "control_id": "<e.g. CC6.1 or §164.312(a)(1)>",
      "control_name": "<control name>",
      "file": "<filepath>",
      "line": <number or null>,
      "description": "<what was found>",
      "remediation": "<specific fix>"
    }
  ],
  "frameworks_checked": ["soc2", "hipaa"],
  "files_reviewed": <number>,
  "sensitive_data_detected": <boolean>
}

Scoring: Start at 100. Each blocking finding: -15 points. Each warning: -5 points. Minimum 0.
Be thorough. Check for: hardcoded secrets, SQL injection, XSS, missing auth, PHI/PII handling, unencrypted HTTP, eval(), empty catch blocks, missing logging.`;

const session = await client.createSession({
  model: "gpt-4.1",
  systemMessage: { mode: "replace", content: SYSTEM_PROMPT },
  onPermissionRequest: approveAll,
});

console.log("Sending to Copilot agent...");

const response = await session.sendAndWait(
  {
    prompt: `Review this pull request for compliance violations:

PR Title: ${pr.title}
PR Description: ${pr.body || "(no description)"}

Changed files:
${diffText}`,
  },
  90_000,
);

const content = response?.data?.content || "";
console.log(`Agent response: ${content.length} chars`);

// 4. Parse review
let review: ComplianceReview | null = null;

// Try ```json block
const jsonFenceMatch = content.match(/```json\n?([\s\S]*?)\n?```/);
if (jsonFenceMatch) {
  try {
    review = JSON.parse(jsonFenceMatch[1]);
  } catch {}
}

// Try bare JSON
if (!review) {
  const bareMatch = content.match(/\{[\s\S]*"score"[\s\S]*"findings"[\s\S]*\}/);
  if (bareMatch) {
    try {
      review = JSON.parse(bareMatch[0]);
    } catch {}
  }
}

// Try full content
if (!review) {
  try {
    review = JSON.parse(content);
  } catch {}
}

if (!review) {
  console.error("Failed to parse review. Raw response:");
  console.error(content.slice(0, 1000));
  await session.destroy();
  await client.stop();
  process.exit(1);
}

console.log(`Score: ${review.score}/100 | Findings: ${review.findings.length}`);
for (const f of review.findings) {
  console.log(`  ${f.severity.toUpperCase()}: [${f.framework}] ${f.control_id} - ${f.description.slice(0, 80)}`);
}

// 5. Format and post comment
const comment = formatReviewComment(review);
console.log("Posting review comment...");

await octokit.issues.createComment({
  owner,
  repo,
  issue_number: pullNumber,
  body: comment,
});

console.log(`Review posted to ${owner}/${repo}#${pullNumber}`);

await session.destroy();
await client.stop();
console.log("Done!");
