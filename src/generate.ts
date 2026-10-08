import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config.js";
import type { RetrievedChunk } from "./retrieve.js";

const client = new Anthropic({ apiKey: config.anthropicKey() });

export const REFUSAL = "I don't have that information. Please contact the business directly.";

// Fixed instructions: identical on every call, so they are cached (cache_control below).
const SYSTEM_PROMPT = `You are a customer assistant for a small business. Answer the customer's question using ONLY the numbered source excerpts provided in the user message.

Rules:
- Cite every factual claim with its source number in square brackets, e.g. [1] or [2][3].
- If the excerpts do not contain the answer, reply with exactly: "${REFUSAL}"
- Never invent prices, times, policies or contact details.
- Be brief and friendly: 1-4 sentences. Plain text, no markdown headings.`;

export interface GenerationResult {
  answer: string;
  refused: boolean;
  model: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens: number;
    cache_creation_input_tokens: number;
  };
}

export function formatContext(chunks: RetrievedChunk[]): string {
  return chunks.map((c, i) => `[${i + 1}] (source: ${c.source})\n${c.content}`).join("\n\n---\n\n");
}

export async function generate(
  question: string,
  chunks: RetrievedChunk[],
  model = config.generationModel,
): Promise<GenerationResult> {
  const msg = await client.messages.create({
    model,
    max_tokens: 400,
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [
      {
        role: "user",
        content: `Source excerpts:\n\n${formatContext(chunks)}\n\nCustomer question: ${question}`,
      },
    ],
  });

  const answer = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  const u = msg.usage as GenerationResult["usage"];
  return {
    answer,
    refused: answer.startsWith(REFUSAL.slice(0, 30)),
    model,
    usage: {
      input_tokens: u.input_tokens ?? 0,
      output_tokens: u.output_tokens ?? 0,
      cache_read_input_tokens: u.cache_read_input_tokens ?? 0,
      cache_creation_input_tokens: u.cache_creation_input_tokens ?? 0,
    },
  };
}
