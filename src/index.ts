import express from "express";
import crypto from "crypto";
import { config } from "./config.js";
import { reviewPullRequest } from "./agent/compliance-agent.js";

const app = express();

app.use("/webhook", express.raw({ type: "application/json" }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "healthy",
    service: "compliance-copilot",
    timestamp: new Date().toISOString(),
  });
});

app.post("/webhook", async (req, res) => {
  const event = req.headers["x-github-event"] as string;
  const signature = req.headers["x-hub-signature-256"] as string;

  if (config.github.webhookSecret) {
    const body = req.body as Buffer;
    const expected =
      "sha256=" +
      crypto
        .createHmac("sha256", config.github.webhookSecret)
        .update(body)
        .digest("hex");
    if (
      !signature ||
      !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    ) {
      console.error("Webhook signature verification failed");
      res.status(401).json({ error: "Invalid signature" });
      return;
    }
  }

  const payload =
    typeof req.body === "string" || Buffer.isBuffer(req.body)
      ? JSON.parse(req.body.toString())
      : req.body;

  if (
    event === "pull_request" &&
    (payload.action === "opened" || payload.action === "synchronize")
  ) {
    const { pull_request, repository } = payload;
    console.log(
      `Received PR ${payload.action}: ${repository.full_name}#${pull_request.number}`,
    );

    res.status(202).json({ message: "Review started" });

    try {
      await reviewPullRequest({
        owner: repository.owner.login,
        repo: repository.name,
        pullNumber: pull_request.number,
        title: pull_request.title,
        body: pull_request.body || "",
      });
      console.log(
        `Review complete for ${repository.full_name}#${pull_request.number}`,
      );
    } catch (error) {
      console.error(
        `Review failed for ${repository.full_name}#${pull_request.number}:`,
        error,
      );
    }
    return;
  }

  res.status(200).json({ message: "Event ignored" });
});

app.post("/review", async (req, res) => {
  const { owner, repo, pullNumber } = req.body;
  if (!owner || !repo || !pullNumber) {
    res
      .status(400)
      .json({ error: "Missing required fields: owner, repo, pullNumber" });
    return;
  }

  console.log(`Manual review triggered: ${owner}/${repo}#${pullNumber}`);
  res.status(202).json({ message: "Review started" });

  try {
    await reviewPullRequest({ owner, repo, pullNumber, title: "", body: "" });
    console.log(`Manual review complete for ${owner}/${repo}#${pullNumber}`);
  } catch (error) {
    console.error("Manual review failed:", error);
  }
});

app.listen(config.port, () => {
  console.log(`Compliance Copilot server running on port ${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Work IQ: ${config.services.workIqUrl}`);
  console.log(`Fabric IQ: ${config.services.fabricIqUrl}`);
});
