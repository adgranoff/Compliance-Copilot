import { config } from "../config.js";

export interface PolicyControl {
  id: string;
  name: string;
  description: string;
  framework: string;
  category: string;
  severity: string;
  requirements: string[];
}

export interface OrgException {
  id: string;
  controlId: string;
  reason: string;
  approvedBy: string;
  expiresAt: string;
  scope: string;
}

const BASE_URL = config.services.workIqUrl;

export async function listPolicies(
  framework?: string,
): Promise<PolicyControl[]> {
  const url = framework
    ? `${BASE_URL}/api/workiq/policies/${framework}`
    : `${BASE_URL}/api/workiq/policies`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Work IQ API error: ${res.status}`);
  return res.json() as Promise<PolicyControl[]>;
}

export async function getControl(
  framework: string,
  controlId: string,
): Promise<PolicyControl> {
  const res = await fetch(
    `${BASE_URL}/api/workiq/policies/${framework}/${controlId}`,
  );
  if (!res.ok) throw new Error(`Work IQ API error: ${res.status}`);
  return res.json() as Promise<PolicyControl>;
}

export async function searchPolicies(
  query: string,
): Promise<PolicyControl[]> {
  const res = await fetch(
    `${BASE_URL}/api/workiq/search?q=${encodeURIComponent(query)}`,
  );
  if (!res.ok) throw new Error(`Work IQ API error: ${res.status}`);
  return res.json() as Promise<PolicyControl[]>;
}

export async function getExceptions(
  controlIds?: string[],
): Promise<OrgException[]> {
  const url = `${BASE_URL}/api/workiq/exceptions`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Work IQ API error: ${res.status}`);
  const exceptions = (await res.json()) as OrgException[];
  if (controlIds) {
    return exceptions.filter((e) => controlIds.includes(e.controlId));
  }
  return exceptions;
}
