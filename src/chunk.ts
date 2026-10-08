/**
 * Paragraph-aware chunker. Approximates tokens as chars / 4.
 * Defaults: ~400 tokens per chunk, ~60 tokens overlap.
 * Experiment: try 200 / 400 / 800 and compare recall@5 in evals.
 */
export function chunkText(text: string, maxTokens = 400, overlapTokens = 60): string[] {
  const maxChars = maxTokens * 4;
  const overlapChars = overlapTokens * 4;
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  const chunks: string[] = [];
  let current = "";
  for (const para of paragraphs) {
    if ((current + "\n\n" + para).length > maxChars && current) {
      chunks.push(current);
      current = current.slice(-overlapChars) + "\n\n" + para; // carry overlap
    } else {
      current = current ? current + "\n\n" + para : para;
    }
    // A single huge paragraph: hard-split it.
    while (current.length > maxChars * 1.5) {
      chunks.push(current.slice(0, maxChars));
      current = current.slice(maxChars - overlapChars);
    }
  }
  if (current) chunks.push(current);
  return chunks;
}
