import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { generateSeedData, type SeedReview } from "./seed.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());

// In-memory store
const reviews: SeedReview[] = generateSeedData();
console.log(`Seeded ${reviews.length} historical reviews`);

// Serve static dashboard files
app.use("/dashboard", express.static(join(__dirname, "dashboard")));

// Health check
app.get("/health", (_req, res) => {
  res.json({
    status: "healthy",
    service: "fabric-iq-mock",
    timestamp: new Date().toISOString(),
    total_reviews: reviews.length,
  });
});

// Store audit record
app.post("/api/fabriciq/audit", (req, res) => {
  const record = req.body;
  const id = `review-${String(reviews.length + 1).padStart(3, "0")}`;
  const entry: SeedReview = {
    id,
    timestamp: new Date().toISOString(),
    ...record,
  };
  reviews.unshift(entry);
  console.log(
    `Stored audit: ${id} for ${record.repo}#${record.pr_number} score=${record.score}`,
  );
  res.status(201).json({ id });
});

// Dashboard summary
app.get("/api/fabriciq/dashboard", (_req, res) => {
  const total = reviews.length;
  const avgScore =
    total > 0
      ? Math.round(reviews.reduce((sum, r) => sum + r.score, 0) / total)
      : 0;
  const totalFindings = reviews.reduce((sum, r) => sum + r.findings_count, 0);
  const blockingFindings = reviews.reduce(
    (sum, r) => sum + r.blocking_count,
    0,
  );

  const frameworkCounts: Record<string, number> = {};
  for (const r of reviews) {
    for (const f of r.frameworks_checked) {
      frameworkCounts[f] = (frameworkCounts[f] || 0) + 1;
    }
  }

  // Score trend (last 30 days, grouped by day)
  const thirtyDaysAgo = Date.now() - 30 * 86400000;
  const recentReviews = reviews.filter(
    (r) => new Date(r.timestamp).getTime() > thirtyDaysAgo,
  );
  const dayMap = new Map<string, number[]>();
  for (const r of recentReviews) {
    const day = r.timestamp.slice(0, 10);
    if (!dayMap.has(day)) dayMap.set(day, []);
    dayMap.get(day)!.push(r.score);
  }
  const scoreTrend = [...dayMap.entries()]
    .map(([date, scores]) => ({
      date,
      score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  res.json({
    total_reviews: total,
    average_score: avgScore,
    total_findings: totalFindings,
    blocking_findings: blockingFindings,
    reviews_by_framework: frameworkCounts,
    score_trend: scoreTrend,
  });
});

// Trends
app.get("/api/fabriciq/trends", (_req, res) => {
  const dayMap = new Map<
    string,
    { scores: number[]; findings: number[] }
  >();
  for (const r of reviews) {
    const day = r.timestamp.slice(0, 10);
    if (!dayMap.has(day)) dayMap.set(day, { scores: [], findings: [] });
    const entry = dayMap.get(day)!;
    entry.scores.push(r.score);
    entry.findings.push(r.findings_count);
  }

  const trends = [...dayMap.entries()]
    .map(([date, data]) => ({
      date,
      score: Math.round(
        data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
      ),
      findings: data.findings.reduce((a, b) => a + b, 0),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  res.json(trends);
});

// Paginated reviews
app.get("/api/fabriciq/reviews", (req, res) => {
  const page = parseInt((req.query.page as string) || "1", 10);
  const limit = parseInt((req.query.limit as string) || "20", 10);
  const start = (page - 1) * limit;
  const end = start + limit;
  const slice = reviews.slice(start, end);

  res.json({
    reviews: slice,
    total: reviews.length,
    page,
    limit,
    has_more: end < reviews.length,
  });
});

// CSV export
app.get("/api/fabriciq/export", (req, res) => {
  const format = req.query.format as string;
  if (format !== "csv") {
    res.status(400).json({ error: "Only CSV format is supported" });
    return;
  }

  const header =
    "id,timestamp,repo,pr_number,score,findings_count,blocking_count,warning_count,frameworks_checked,sensitive_data\n";
  const rows = reviews
    .map(
      (r) =>
        `${r.id},${r.timestamp},${r.repo},${r.pr_number},${r.score},${r.findings_count},${r.blocking_count},${r.warning_count},"${r.frameworks_checked.join(";")}",${r.sensitive_data_detected}`,
    )
    .join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=compliance-reviews.csv",
  );
  res.send(header + rows);
});

const PORT = parseInt(process.env.FABRIC_IQ_PORT || "3002", 10);
app.listen(PORT, () => {
  console.log(`Fabric IQ mock server running on port ${PORT}`);
  console.log(`Dashboard available at http://localhost:${PORT}/dashboard`);
});
