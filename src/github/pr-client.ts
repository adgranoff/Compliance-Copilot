import { Octokit } from "@octokit/rest";
import { config } from "../config.js";

const octokit = new Octokit({ auth: config.github.token });

export interface PrFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch?: string;
  contents?: string;
}

export interface PrDiff {
  files: PrFile[];
  totalAdditions: number;
  totalDeletions: number;
  totalFiles: number;
}

export async function fetchPrDiff(
  owner: string,
  repo: string,
  pullNumber: number,
): Promise<PrDiff> {
  const { data: files } = await octokit.pulls.listFiles({
    owner,
    repo,
    pull_number: pullNumber,
    per_page: 100,
  });

  const prFiles: PrFile[] = files.map((f) => ({
    filename: f.filename,
    status: f.status,
    additions: f.additions,
    deletions: f.deletions,
    patch: f.patch,
  }));

  return {
    files: prFiles,
    totalAdditions: prFiles.reduce((sum, f) => sum + f.additions, 0),
    totalDeletions: prFiles.reduce((sum, f) => sum + f.deletions, 0),
    totalFiles: prFiles.length,
  };
}

export async function postReviewComment(
  owner: string,
  repo: string,
  pullNumber: number,
  body: string,
): Promise<void> {
  await octokit.issues.createComment({
    owner,
    repo,
    issue_number: pullNumber,
    body,
  });
}
