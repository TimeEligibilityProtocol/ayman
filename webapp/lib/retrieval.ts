// Pure-TS port of the TF-IDF-ish relevance scoring from the terminal
// prototype (editor.py). No embedding API, no extra dependency — good
// enough to pull a handful of genuinely related past Stories/turns into
// context instead of relying on Story Memory + a short recent window alone.

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "be",
  "been", "to", "of", "in", "on", "at", "for", "with", "that", "this",
  "it", "i", "you", "he", "she", "they", "we", "my", "your", "his",
  "her", "their", "our", "me", "him", "them", "us", "as", "if", "so",
  "not", "do", "did", "does", "have", "has", "had", "will", "would",
  "could", "should", "can", "just", "about", "into", "than", "then",
  "there", "what", "when", "where", "who", "how", "why", "which",
]);

export function tokenize(text: string): string[] {
  const words = (text.toLowerCase().match(/[a-zà-öø-ÿąćęłńóśźż]+/gi) || []) as string[];
  return words.filter((w) => !STOPWORDS.has(w) && w.length > 2);
}

export interface RetrievalCandidate {
  id: string;
  text: string;
}

export function retrieveRelevant<T extends RetrievalCandidate>(
  candidates: T[],
  queryText: string,
  topK: number
): T[] {
  if (candidates.length === 0) return [];

  const docTokens = new Map<string, Set<string>>();
  const docFreq = new Map<string, number>();

  for (const c of candidates) {
    const toks = new Set(tokenize(c.text));
    docTokens.set(c.id, toks);
    for (const w of toks) {
      docFreq.set(w, (docFreq.get(w) || 0) + 1);
    }
  }

  const queryToks = new Set(tokenize(queryText));
  const nDocs = candidates.length;

  const scored: Array<{ score: number; c: T }> = [];
  for (const c of candidates) {
    const toks = docTokens.get(c.id)!;
    const overlap = [...queryToks].filter((w) => toks.has(w));
    if (overlap.length === 0) continue;
    const score = overlap.reduce((sum, w) => {
      const df = docFreq.get(w) || 0;
      return sum + (Math.log((nDocs + 1) / (df + 1)) + 1);
    }, 0);
    scored.push({ score, c });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map((s) => s.c);
}
