import { describe, expect, it } from "vitest";
import { candidateDocIds, toEvalCase, toMarkdown, type TechQAQuestion } from "../src/techqa.js";

const q = (over: Partial<TechQAQuestion> = {}): TechQAQuestion => ({
  QUESTION_ID: "DEV_Q000",
  QUESTION_TITLE: "  Install fails  ",
  QUESTION_TEXT: "\n\nThe installer says my OS is unsupported.\n",
  DOC_IDS: ["swg2", "swg1"],
  ANSWERABLE: "Y",
  DOCUMENT: "swg1",
  ANSWER: " Use the silent installer. ",
  ...over,
});

describe("toEvalCase", () => {
  it("maps an answerable question to the eval format", () => {
    expect(toEvalCase(q())).toEqual({
      id: "DEV_Q000",
      question: "Install fails\n\nThe installer says my OS is unsupported.",
      answerable: true,
      expected_source: "swg1.md",
      expected_answer: "Use the silent installer.",
    });
  });

  it("maps an unanswerable question to a refusal case with no source", () => {
    const c = toEvalCase(q({ ANSWERABLE: "N", DOCUMENT: "-", ANSWER: "-" }));
    expect(c.answerable).toBe(false);
    expect(c.expected_source).toBeNull();
    expect(c.expected_answer).toMatch(/refuse/);
  });

  it("doesn't repeat a body that equals the title", () => {
    expect(toEvalCase(q({ QUESTION_TEXT: "Install fails" })).question).toBe("Install fails");
    expect(toEvalCase(q({ QUESTION_TEXT: "  " })).question).toBe("Install fails");
  });
});

describe("toMarkdown", () => {
  it("puts the title in a heading so ingest picks it up", () => {
    expect(toMarkdown({ id: "swg1", title: " IBM fix ", text: " Body text. " })).toBe("# IBM fix\n\nBody text.\n");
  });
});

describe("candidateDocIds", () => {
  it("returns every candidate once, sorted", () => {
    expect(candidateDocIds([q(), q({ DOC_IDS: ["swg3", "swg1"] })])).toEqual(["swg1", "swg2", "swg3"]);
  });
});
