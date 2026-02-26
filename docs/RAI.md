# Responsible AI Considerations

## Overview

Compliance Copilot uses AI to review code for regulatory compliance violations. As an AI system operating in a high-stakes domain (regulatory compliance), we take responsible AI principles seriously.

## Human-in-the-Loop Design

Compliance Copilot is designed as an **advisory tool**, not an enforcement mechanism:

- **Reviews are informational** — The agent posts findings as PR comments, not blocking checks. Human reviewers make the final merge decision.
- **No auto-merge/block** — The system never automatically blocks or approves PRs. All compliance decisions require human judgment.
- **Exception workflow** — Organizational exceptions can be registered in Work IQ, allowing compliance teams to approve deviations with documented rationale.
- **Confidence transparency** — Findings reference specific framework controls so reviewers can validate the agent's reasoning.

## Limitations

### What It Can Do
- Detect common compliance patterns (hardcoded secrets, SQL injection, PHI handling)
- Map code changes to specific framework controls (SOC 2, HIPAA)
- Provide actionable remediation guidance
- Create an audit trail for compliance reporting

### What It Cannot Do
- **Replace human compliance review** — AI cannot understand full business context, organizational culture, or nuanced risk tradeoffs
- **Guarantee completeness** — Novel violation patterns may not be detected
- **Assess intent** — The agent evaluates code patterns, not developer intent
- **Make legal determinations** — Compliance determination is ultimately a legal and organizational decision

### Known Limitations
- Pattern-based detection has false positives (e.g., test data containing "patient" triggers PHI alerts)
- Framework coverage is limited to SOC 2 and HIPAA; other frameworks (PCI-DSS, GDPR, FedRAMP) require additional control definitions
- Agent reasoning quality depends on the underlying LLM's capabilities and training data
- Detection of obfuscated or encoded sensitive data is limited

## Bias and Fairness

- **Language bias** — Patterns are optimized for English-language code and comments. Non-English identifiers may have lower detection rates.
- **Framework bias** — SOC 2 and HIPAA receive deeper coverage; organizations with other primary frameworks should supplement with additional controls.
- **Technology bias** — Patterns are optimized for TypeScript/JavaScript, Python, and common web frameworks. Legacy or niche languages may have lower coverage.

## Data Privacy

- **No data storage** — The agent processes PR diffs in memory and does not persist source code
- **Audit records** — Only metadata is stored (score, finding summaries, control IDs) — not source code
- **Token scoping** — GitHub token is scoped to minimum required permissions (read PR, post comments)
- **Secret handling** — Detected secrets are never logged or transmitted; only the finding description is recorded

## Transparency

- Every finding references a specific compliance framework control ID
- The review comment clearly identifies itself as AI-generated
- Confidence level and remediation guidance are provided for all findings
- The system prompt and tool definitions are open source and auditable

## Incident Response

If the AI produces harmful, incorrect, or misleading compliance guidance:
1. The review can be dismissed or corrected by human reviewers
2. Incorrect findings can be documented as organizational exceptions
3. Pattern definitions can be updated to reduce false positives
4. The system prompt can be refined to improve accuracy

## Continuous Improvement

- All reviews are recorded in Fabric IQ for trend analysis
- False positive/negative rates can be tracked over time
- Framework definitions are versioned and updateable
- Community contributions can expand coverage to new frameworks and patterns
