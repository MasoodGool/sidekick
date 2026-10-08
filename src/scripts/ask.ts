import { answer } from "../answer.js";
import { pool } from "../db.js";

const question = process.argv.slice(2).join(" ");
if (!question) {
  console.error('Usage: npm run ask -- "What time do you open on Saturday?"');
  process.exit(1);
}
const r = await answer(question);
console.log(`\n${r.answer}\n`);
r.chunks.forEach((c, i) =>
  console.log(`[${i + 1}] ${c.source} #${c.id}  rrf=${c.score.toFixed(4)}  vec=${c.vectorRank ?? "-"} kw=${c.keywordRank ?? "-"}`),
);
console.log(`\n${JSON.stringify({ usage: r.gen.usage, costUsd: r.costUsd, timings: r.timings })}`);
await pool.end();
