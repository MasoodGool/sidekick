/**
 * Build Sidekick's TechQA corpus and eval set from data/techqa/raw (see scripts/techqa-fetch.sh):
 *   data/techqa/docs/<id>.md   every technote a dev question lists as a candidate (gitignored)
 *   evals/techqa-dev.jsonl     the 310 dev questions with TechQA's own labels (committed)
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { candidateDocIds, sourceName, toEvalCase, toMarkdown, type TechNote, type TechQAQuestion } from "../techqa.js";

const RAW = "data/techqa/raw/training_and_dev";
const DOCS = "data/techqa/docs";

const dev = JSON.parse(readFileSync(join(RAW, "dev_Q_A.json"), "utf8")) as TechQAQuestion[];
const notes = JSON.parse(readFileSync(join(RAW, "training_dev_technotes.json"), "utf8")) as Record<string, TechNote>;

const ids = candidateDocIds(dev);
const missing = ids.filter((id) => !notes[id]);
if (missing.length) throw new Error(`${missing.length} candidate technotes missing, e.g. ${missing[0]}`);

rmSync(DOCS, { recursive: true, force: true });
mkdirSync(DOCS, { recursive: true });
for (const id of ids) writeFileSync(join(DOCS, sourceName(id)), toMarkdown(notes[id]));

const cases = dev.map(toEvalCase);
writeFileSync("evals/techqa-dev.jsonl", cases.map((c) => JSON.stringify(c)).join("\n") + "\n");

const answerable = cases.filter((c) => c.answerable).length;
console.log(`Corpus: ${ids.length} technotes -> ${DOCS}`);
console.log(`Eval set: ${cases.length} questions (${answerable} answerable, ${cases.length - answerable} unanswerable) -> evals/techqa-dev.jsonl`);
