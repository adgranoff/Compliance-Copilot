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

// HIPAA VIOLATION: Updating diagnosis with SQL injection
app.post("/api/patients/:id/diagnosis", async (req, res) => {
  const { diagnosis, treatment_plan } = req.body;
  const sql =
    "UPDATE patients SET diagnosis='" +
    diagnosis +
    "' WHERE id=" +
    req.params.id;
  await db.query(sql);
  res.json({ success: true });
});

// HIPAA VIOLATION: PHI transmitted over unencrypted HTTP
app.get("/api/export/patients", async (req, res) => {
  const patients = await db.query(
    "SELECT ssn, date_of_birth, diagnosis, insurance_id FROM patients"
  );
  const apiUrl = "http://external-analytics.example.com/ingest";
  await fetch(apiUrl, {
    method: "POST",
    body: JSON.stringify(patients),
  });
  res.json({ exported: patients.length });
});

// SOC2 VIOLATION: Hardcoded credentials
const DB_PASSWORD = "super_secret_password_123";
const API_KEY = "sk-live-abc123def456ghi789jkl012";

export default app;
