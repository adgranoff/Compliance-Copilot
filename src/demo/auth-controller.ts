import express from "express";

const app = express();

// SOC2 VIOLATION: SQL injection in login
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await db.query(
    `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`
  );
  if (user) {
    // SOC2 VIOLATION: Session cookie not httpOnly, no expiration
    res.cookie("session", user.id, { httpOnly: false });
    res.json({ token: user.id });
  }
});

// SOC2 VIOLATION: Admin endpoint with no authorization check
app.delete("/api/admin/users/:id", async (req, res) => {
  await db.query(`DELETE FROM users WHERE id = ${req.params.id}`);
  res.json({ deleted: true });
});

// SOC2 VIOLATION: XSS via unescaped user input
app.get("/api/profile", (req, res) => {
  const name = req.query.name;
  res.send(`<html><body><h1>Welcome ${name}</h1></body></html>`);
});

// SOC2 VIOLATION: Dangerous eval usage
app.post("/api/calculate", (req, res) => {
  const { expression } = req.body;
  const result = eval(expression);
  res.json({ result });
});

// SOC2 VIOLATION: Empty catch block swallows errors
app.use((err: any, req: any, res: any, next: any) => {
  try {
    handleError(err);
  } catch (e) {}
  res.status(500).json({ error: "Something went wrong" });
});

export default app;
