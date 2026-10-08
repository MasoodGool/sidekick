import { config } from "./config.js";

type InputType = "document" | "query";

/**
 * Embed texts with Voyage AI. Documents and queries use different input_type
 * so the model can optimise each side of retrieval.
 */
export async function embed(texts: string[], inputType: InputType): Promise<number[][]> {
  const out: number[][] = [];
  const batchSize = 64;
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const res = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.voyageKey()}`,
      },
      body: JSON.stringify({ input: batch, model: config.embeddingModel, input_type: inputType }),
    });
    if (!res.ok) throw new Error(`Voyage embeddings failed: ${res.status} ${await res.text()}`);
    const json = (await res.json()) as { data: { embedding: number[]; index: number }[] };
    json.data.sort((a, b) => a.index - b.index).forEach((d) => out.push(d.embedding));
  }
  return out;
}

export async function embedQuery(text: string): Promise<number[]> {
  return (await embed([text], "query"))[0];
}
