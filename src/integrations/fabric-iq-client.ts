import { config } from "../config.js";

export interface AuditRecord {
  id?: string;
  timestamp?: string;
  pr_number: number;
  repo: string;
  score: number;
  findings_count: number;
  blocking_count: number;
  warning_count: number;
  frameworks_checked: string[];
  sensitive_data_detected: boolean;
  findings: AuditFinding[];
}

export interface AuditFinding {
  severity: string;
  framework: string;
  control_id: string;
  description: string;
}

export interface DashboardSummary {
  total_reviews: number;
  average_score: number;
  total_findings: number;
  blocking_findings: number;
  reviews_by_framework: Record<string, number>;
  score_trend: Array<{ date: string; score: number }>;
}

const BASE_URL = config.services.fabricIqUrl;

export async function storeAuditRecord(record: AuditRecord): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/fabriciq/audit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record),
  });
  if (!res.ok) throw new Error(`Fabric IQ API error: ${res.status}`);
  const data = (await res.json()) as { id: string };
  return data.id;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const res = await fetch(`${BASE_URL}/api/fabriciq/dashboard`);
  if (!res.ok) throw new Error(`Fabric IQ API error: ${res.status}`);
  return res.json() as Promise<DashboardSummary>;
}

export async function getTrends(): Promise<
  Array<{ date: string; score: number; findings: number }>
> {
  const res = await fetch(`${BASE_URL}/api/fabriciq/trends`);
  if (!res.ok) throw new Error(`Fabric IQ API error: ${res.status}`);
  return res.json() as Promise<
    Array<{ date: string; score: number; findings: number }>
  >;
}

export async function getReviews(
  page = 1,
  limit = 20,
): Promise<{ reviews: AuditRecord[]; total: number; has_more: boolean }> {
  const res = await fetch(
    `${BASE_URL}/api/fabriciq/reviews?page=${page}&limit=${limit}`,
  );
  if (!res.ok) throw new Error(`Fabric IQ API error: ${res.status}`);
  return res.json() as Promise<{
    reviews: AuditRecord[];
    total: number;
    has_more: boolean;
  }>;
}
