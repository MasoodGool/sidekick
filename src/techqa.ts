/** Pure transforms from the TechQA release format to Sidekick's corpus and eval formats. */

export interface TechQAQuestion {
  QUESTION_ID: string;
  QUESTION_TITLE: string;
  QUESTION_TEXT: string;
  DOC_IDS: string[];
  ANSWERABLE: "Y" | "N";
  DOCUMENT: string; // "-" when unanswerable
  ANSWER: string; // "-" when unanswerable
}

export interface TechNote {
  id: string;
  title: string;
  text: string; // plain text; the release's `content` field is raw HTML
}

/** Same shape as evals/dataset.jsonl, so evals/run.ts scores both. */
export interface EvalCase {
  id: string;
  question: string;
  answerable: boolean;
  expected_source: string | null;
  expected_answer: string;
}

/** Each technote is ingested as one document named `<id>.md`. */
export const sourceName = (docId: string) => `${docId}.md`;

export function toEvalCase(q: TechQAQuestion): EvalCase {
  const title = q.QUESTION_TITLE.trim();
  const body = q.QUESTION_TEXT.trim();
  // The body sometimes repeats the title verbatim; don't send it twice.
  const question = !body || body === title ? title : `${title}\n\n${body}`;
  const answerable = q.ANSWERABLE === "Y";
  return {
    id: q.QUESTION_ID,
    question,
    answerable,
    expected_source: answerable ? sourceName(q.DOCUMENT) : null,
    expected_answer: answerable ? q.ANSWER.trim() : "Not in the documents: should refuse",
  };
}

/** Markdown with a `# title` heading, which src/ingest.ts reads as the document title. */
export function toMarkdown(note: TechNote): string {
  return `# ${note.title.trim()}\n\n${note.text.trim()}\n`;
}

/** Every technote any question lists as a candidate, sorted for a stable corpus. */
export function candidateDocIds(questions: TechQAQuestion[]): string[] {
  return [...new Set(questions.flatMap((q) => q.DOC_IDS))].sort();
}
