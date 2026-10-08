/**
 * Eval harness. Usage:
 *   npm run eval                          # hybrid retrieval, default model
 *   npm run eval -- --mode vector         # compare retrieval modes
 *   npm run eval -- --model claude-sonnet-5-5
 *
 * Metrics:
 *   recall@5      answerable questions whose expected source is in the top 5 chunks
 *   faithfulness  answers with no claims beyond the retrieved sources (Claude judge)
 *   correctness   answers that match the expected answer (Claude judge)
 *   refusal acc.  refused exactly when the question is unanswerable
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { answer } from "../src/answer.js";
import { formatContext } from "../src/generate.js";
import { costUsd } from "../src/obs/trace.js";
import { config } from "../src/config.js";
import { pool } from "../src/db.js";
import type { RetrievalMode } from "../src/retrieve.js";

interface Case {
  id: string; question: string; answerable: boolean;
  expected_source: string | null; expected_answer: string;
}

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const mode = (arg("mode") ?? "hybrid") as RetrievalMode;
const model = arg("model") ?? config.generationModel;

const cases: Case[] = readFileSync("evals/dataset.jsonl", "utf8")
  .split("\n").filter(Boolean).map((l) => JSON.parse(l));

const judge = new Anthropic({ apiKey: config.anthropicKey() });

async function judgeAnswer(c: Case, context: string, ans: string) {
  const msg = await judge.messages.create({
    model: config.judgeModel,
    max_tokens: 300,
    system:
      "You grade a customer-support RAG system. Reply with ONLY a JSON object: " +
      '{"faithful": boolean, "correct": boolean, "reason": string}. ' +
      "faithful = every factual claim in the ANSWER is supported by the SOURCES. " +
      "correct = the ANSWER conveys the EXPECTED answer (wording may differ).",
    messages: [{
      role: "user",
      content: `SOURCES:\n${context}\n\nQUESTION: ${c.question}\nEXPECTED: ${c.expected_answer}\nANSWER: ${ans}`,
    }],
  });
  const text = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  return JSON.parse(json) as { faithful: boolean; correct: boolean; reason: string };
}

const rows = [];
let totalCost = 0, costKnown = true;
for (const c of cases) {
  const r = await answer(c.question, { mode, model, trace: false });
  const sources = r.chunks.map((x) => x.source);
  const hit = c.expected_source ? sources.includes(c.expected_source) : null;
  const refusalOk = r.refused === !c.answerable;
  const verdict = c.answerable && !r.refused
    ? await judgeAnswer(c, formatContext(r.chunks), r.answer)
    : { faithful: true, correct: refusalOk, reason: r.refused ? "refused" : "answered an unanswerable question" };
  const cost = costUsd(r.gen.usage);
  if (cost == null) costKnown = false; else totalCost += cost;
  rows.push({ id: c.id, question: c.question, answer: r.answer, sources, hit, refused: r.refused, refusalOk, ...verdict, ms: r.timings.totalMs, usage: r.gen.usage });
  console.log(`${c.id} ${hit === false ? "MISS" : "    "} ${refusalOk ? "" : "REFUSAL-ERR"} ${verdict.correct ? "ok " : "BAD"} ${c.question}`);
}

const answerable = rows.filter((r) => r.hit !== null);
const answered = rows.filter((r) => !r.refused);
const pct = (n: number, d: number) => (d ? Math.round((100 * n) / d) : 0);
const summary = {
  mode, model, n: rows.length,
  recall_at_5: pct(answerable.filter((r) => r.hit).length, answerable.length),
  faithfulness: pct(answered.filter((r) => r.faithful).length, answered.length),
  correctness: pct(rows.filter((r) => r.correct).length, rows.length),
  refusal_accuracy: pct(rows.filter((r) => r.refusalOk).length, rows.length),
  avg_ms: Math.round(rows.reduce((s, r) => s + r.ms, 0) / rows.length),
  cost_per_1k_questions_usd: costKnown ? +(totalCost / rows.length * 1000).toFixed(2) : "set PRICE_* env vars",
};
console.table(summary);

mkdirSync("evals/results", { recursive: true });
const file = `evals/results/${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}-${mode}-${model}.json`;
writeFileSync(file, JSON.stringify({ summary, rows }, null, 2));
console.log(`Saved ${file}`);
await pool.end();
