#!/bin/bash
# Demo Setup Script for Compliance Copilot
# Creates sample PR branches with deliberate compliance violations

set -e

echo "=== Compliance Copilot Demo Setup ==="
echo ""

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "Error: Node.js is required"; exit 1; }
command -v git >/dev/null 2>&1 || { echo "Error: git is required"; exit 1; }
command -v gh >/dev/null 2>&1 || { echo "Warning: GitHub CLI (gh) recommended for PR creation"; }

echo "1. Installing dependencies..."
npm install

echo ""
echo "2. Creating demo branches with compliance violations..."

# Branch 1: HIPAA violation
git checkout -b demo/hipaa-violation main 2>/dev/null || git checkout -b demo/hipaa-violation
mkdir -p src/demo
cat > src/demo/patient-service.ts << 'EOF'
import express from "express";

const app = express();

// HIPAA VIOLATION: No authentication on PHI endpoint
app.get("/api/patients/:id", async (req, res) => {
  const patient = await db.query(
    `SELECT * FROM patients WHERE id = ${req.params.id}`
  );
  // HIPAA VIOLATION: Logging PHI to console
  console.log("Patient accessed:", patient.ssn, patient.diagnosis);
  res.json(patient);
});

// HIPAA VIOLATION: PHI transmitted over HTTP
const ANALYTICS_URL = "http://analytics.example.com/ingest";

// SOC2 VIOLATION: Hardcoded credentials
const DB_PASSWORD = "super_secret_password_123";
const API_KEY = "sk-live-abc123def456ghi789";

export default app;
EOF
git add -A
git commit -m "Add patient service with compliance issues"

# Branch 2: SOC2 violation
git checkout -b demo/soc2-violation main 2>/dev/null || git checkout -b demo/soc2-violation
cat > src/demo/auth-controller.ts << 'EOF'
import express from "express";

const app = express();

// SOC2 VIOLATION: SQL injection in login
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await db.query(
    `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`
  );
  if (user) {
    res.cookie("session", user.id, { httpOnly: false });
    res.json({ token: user.id });
  }
});

// SOC2 VIOLATION: XSS via innerHTML
app.get("/api/profile", (req, res) => {
  const name = req.query.name;
  res.send(`<html><body><h1>Welcome ${name}</h1></body></html>`);
});

// SOC2 VIOLATION: Empty catch block
app.use((err: any, req: any, res: any, next: any) => {
  try { handleError(err); } catch (e) {}
  res.status(500).json({ error: "Something went wrong" });
});

export default app;
EOF
git add -A
git commit -m "Add auth controller with security issues"

# Return to main
git checkout main

echo ""
echo "3. Demo branches created:"
echo "   - demo/hipaa-violation (PHI handling, hardcoded secrets, HTTP transmission)"
echo "   - demo/soc2-violation (SQL injection, XSS, empty catch blocks)"
echo ""
echo "4. To create PRs:"
echo "   gh pr create --base main --head demo/hipaa-violation --title 'Add patient service' --body 'New patient data service'"
echo "   gh pr create --base main --head demo/soc2-violation --title 'Add auth controller' --body 'New authentication system'"
echo ""
echo "5. Start the services:"
echo "   npm run dev:all"
echo ""
echo "=== Setup complete! ==="
