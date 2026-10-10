import { describe, expect, it } from "vitest";
import { MAX_QUESTION_CHARS, parseQuestion } from "../src/validate.js";

describe("parseQuestion", () => {
  it("accepts a question and trims it", () => {
    expect(parseQuestion({ question: "  Do you deliver?  " })).toEqual({ ok: true, question: "Do you deliver?" });
  });

  it.each([undefined, null, {}, { question: "" }, { question: "   \n\t" }, { question: null }])(
    "rejects a missing or blank question: %j",
    (body) => {
      expect(parseQuestion(body)).toEqual({ ok: false, error: "question is required" });
    },
  );

  it("allows exactly the maximum length and rejects one more", () => {
    expect(parseQuestion({ question: "x".repeat(MAX_QUESTION_CHARS) }).ok).toBe(true);
    expect(parseQuestion({ question: "x".repeat(MAX_QUESTION_CHARS + 1) })).toEqual({ ok: false, error: "question too long" });
  });

  it("measures length after trimming", () => {
    expect(parseQuestion({ question: "  " + "x".repeat(MAX_QUESTION_CHARS) + "  " }).ok).toBe(true);
  });

  it("coerces non-string input the same way the handler always has", () => {
    expect(parseQuestion({ question: 42 })).toEqual({ ok: true, question: "42" });
  });
});
