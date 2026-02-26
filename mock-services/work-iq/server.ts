import express from "express";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());

// Load policy data
const policiesDir = join(__dirname, "policies");
const soc2 = JSON.parse(readFileSync(join(policiesDir, "soc2.json"), "utf-8"));
const hipaa = JSON.parse(
  readFileSync(join(policiesDir, "hipaa.json"), "utf-8"),
);
const exceptions = JSON.parse(
  readFileSync(join(policiesDir, "exceptions.json"), "utf-8"),
);

const allPolicies = [...soc2, ...hipaa];

// Health check
app.get("/health", (_req, res) => {
  res.json({
    status: "healthy",
    service: "work-iq-mock",
    timestamp: new Date().toISOString(),
  });
});

// List all frameworks
app.get("/api/workiq/policies", (_req, res) => {
  res.json(allPolicies);
});

// Get policies by framework
app.get("/api/workiq/policies/:framework", (req, res) => {
  const { framework } = req.params;
  if (framework === "soc2") return res.json(soc2);
  if (framework === "hipaa") return res.json(hipaa);
  res.status(404).json({ error: `Framework '${framework}' not found` });
});

// Get specific control
app.get("/api/workiq/policies/:framework/:controlId", (req, res) => {
  const { framework, controlId } = req.params;
  const policies = framework === "soc2" ? soc2 : framework === "hipaa" ? hipaa : [];
  const control = policies.find(
    (p: { id: string }) => p.id === controlId || p.id === decodeURIComponent(controlId),
  );
  if (!control) {
    res.status(404).json({ error: `Control '${controlId}' not found` });
    return;
  }
  res.json(control);
});

// Search policies
app.get("/api/workiq/search", (req, res) => {
  const q = (req.query.q as string || "").toLowerCase();
  if (!q) return res.json(allPolicies);

  const results = allPolicies.filter(
    (p: { name: string; description: string; category: string; id: string }) =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q),
  );
  res.json(results);
});

// Get exceptions
app.get("/api/workiq/exceptions", (_req, res) => {
  res.json(exceptions);
});

const PORT = parseInt(process.env.WORK_IQ_PORT || "3001", 10);
app.listen(PORT, () => {
  console.log(`Work IQ mock server running on port ${PORT}`);
  console.log(`Loaded ${soc2.length} SOC 2 controls, ${hipaa.length} HIPAA controls, ${exceptions.length} exceptions`);
});
