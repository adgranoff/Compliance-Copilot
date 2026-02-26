import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  getControlsByFramework,
  getControlById,
  allControls,
} from "../src/compliance/frameworks.js";
import { scanContent } from "../src/compliance/patterns.js";

describe("compliance frameworks", () => {
  it("returns SOC2 controls", () => {
    const controls = getControlsByFramework("soc2");
    expect(controls.length).toBeGreaterThan(0);
    expect(controls.every((c) => c.framework === "soc2")).toBe(true);
  });

  it("returns HIPAA controls", () => {
    const controls = getControlsByFramework("hipaa");
    expect(controls.length).toBeGreaterThan(0);
    expect(controls.every((c) => c.framework === "hipaa")).toBe(true);
  });

  it("finds control by ID", () => {
    const control = getControlById("CC6.1");
    expect(control).toBeDefined();
    expect(control!.name).toBe("Logical Access Controls");
  });

  it("finds HIPAA control by ID", () => {
    const control = getControlById("§164.312(a)(1)");
    expect(control).toBeDefined();
    expect(control!.framework).toBe("hipaa");
  });

  it("returns undefined for unknown control", () => {
    expect(getControlById("NONEXISTENT")).toBeUndefined();
  });

  it("allControls contains both frameworks", () => {
    const frameworks = new Set(allControls.map((c) => c.framework));
    expect(frameworks.has("soc2")).toBe(true);
    expect(frameworks.has("hipaa")).toBe(true);
  });
});

describe("pattern scanning", () => {
  it("detects hardcoded secrets", () => {
    const content = 'const API_KEY = "sk-live-abc123def456ghi789jkl012";';
    const matches = scanContent(content, "config.ts");
    expect(matches.some((m) => m.controlId === "CC6.2")).toBe(true);
  });

  it("detects SQL injection", () => {
    const content =
      'const sql = `SELECT * FROM users WHERE id = ${userId}`;';
    const matches = scanContent(content, "query.ts");
    expect(matches.some((m) => m.controlId === "CC6.6")).toBe(true);
  });

  it("detects PHI handling", () => {
    const content = "const diagnosis = patient.medical_record;";
    const matches = scanContent(content, "patient.ts");
    expect(
      matches.some((m) => m.controlId === "§164.312(a)(1)"),
    ).toBe(true);
  });

  it("detects unencrypted HTTP", () => {
    const content = 'fetch("http://external-api.example.com/data")';
    const matches = scanContent(content, "api.ts");
    expect(matches.some((m) => m.controlId === "CC6.7")).toBe(true);
  });

  it("detects eval usage", () => {
    const content = 'const result = eval(userInput);';
    const matches = scanContent(content, "handler.ts");
    expect(matches.some((m) => m.controlId === "CC6.8")).toBe(true);
  });

  it("returns empty for clean code", () => {
    const content = `
import { authenticate } from "./auth";
import { logger } from "./logger";

export async function getUser(id: string) {
  logger.info("getUser called", { id });
  return await db.findById(id);
}`;
    const matches = scanContent(content, "user-service.ts");
    // Clean code should have minimal or no vulnerability matches
    const vulnerabilities = matches.filter(
      (m) => m.type === "vulnerability",
    );
    expect(vulnerabilities.length).toBe(0);
  });

  it("detects SSN handling", () => {
    const content = "const ssn = patient.social_security_number;";
    const matches = scanContent(content, "form.ts");
    expect(matches.some((m) => m.type === "sensitive_data")).toBe(true);
  });

  it("scans HIPAA violation fixture file", () => {
    const fixture = readFileSync(
      join(__dirname, "fixtures", "hipaa-violation.diff"),
      "utf-8",
    );
    const matches = scanContent(fixture, "hipaa-violation.diff");
    // Should detect multiple issues
    expect(matches.length).toBeGreaterThan(3);
    // Should detect PHI
    expect(
      matches.some((m) => m.framework === "hipaa" || m.framework === "both"),
    ).toBe(true);
    // Should detect hardcoded secrets
    expect(
      matches.some((m) => m.controlId === "CC6.2"),
    ).toBe(true);
  });
});
