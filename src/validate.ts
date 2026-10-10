export const MAX_QUESTION_CHARS = 1000;

export type QuestionCheck = { ok: true; question: string } | { ok: false; error: string };

/** Validate the /api/ask body: a non-empty question of at most MAX_QUESTION_CHARS. */
export function parseQuestion(body: unknown): QuestionCheck {
  const raw = (body as { question?: unknown } | null | undefined)?.question;
  const question = String(raw ?? "").trim();
  if (!question) return { ok: false, error: "question is required" };
  if (question.length > MAX_QUESTION_CHARS) return { ok: false, error: "question too long" };
  return { ok: true, question };
}
