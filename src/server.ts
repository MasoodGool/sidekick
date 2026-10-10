import express from "express";
import { config } from "./config.js";
import { answer } from "./answer.js";
import { pool } from "./db.js";
import { parseQuestion } from "./validate.js";

const app = express();
app.use(express.json());
app.use(express.static("public"));

app.post("/api/ask", async (req, res) => {
  const parsed = parseQuestion(req.body);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  try {
    const r = await answer(parsed.question);
    res.json({ answer: r.answer, refused: r.refused, sources: r.sources, costUsd: r.costUsd, timings: r.timings });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Simple ops view: request volume, latency and spend.
app.get("/api/stats", async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT count(*)::int AS requests,
            round(avg(total_ms))::int AS avg_ms,
            percentile_cont(0.95) WITHIN GROUP (ORDER BY total_ms)::int AS p95_ms,
            round(sum(cost_usd)::numeric, 4) AS total_cost_usd,
            round(avg(cost_usd)::numeric, 6) AS avg_cost_usd,
            round(avg(CASE WHEN refused THEN 1 ELSE 0 END)::numeric, 3) AS refusal_rate,
            sum(cache_read_tokens)::int AS cache_read_tokens
       FROM traces WHERE business_id = $1`,
    [config.businessId],
  );
  res.json(rows[0]);
});

app.listen(config.port, () => console.log(`Sidekick on http://localhost:${config.port}`));
