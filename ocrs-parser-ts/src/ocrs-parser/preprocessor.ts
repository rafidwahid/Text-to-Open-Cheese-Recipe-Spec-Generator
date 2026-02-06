export type InputFormat = "structured" | "semi-structured" | "unstructured";

export interface PreprocessResult {
  text: string;
  format: InputFormat;
}

const MAX_INPUT_LENGTH = 50_000; // 12K tokens roughly

const STRUCTURED_MARKERS = [
  /ingredients?\s*:/i,
  /instructions?\s*:/i,
  /directions?\s*:/i,
  /method\s*:/i,
  /steps?\s*:/i,
  /procedure\s*:/i,
];

export function preprocess(raw: string): PreprocessResult {
  let text = raw.trim();

  if (text.length === 0) {
    throw new Error("Input text is empty");
  }

  if (text.length > MAX_INPUT_LENGTH) {
    throw new Error(
      `Input text exceeds maximum length of ${MAX_INPUT_LENGTH} characters`,
    );
  }

  // Normalize unicode: NFC normalization for consistent encoding
  text = text.normalize("NFC");

  // Normalize typographic quotes to ASCII equivalents
  text = text.replace(/[\u201C\u201D\u201E\u201F]/g, '"');
  text = text.replace(/[\u2018\u2019\u201A\u201B]/g, "'");

  // Collapse excessive newlines (3+ → 2)
  text = text.replace(/\n{3,}/g, "\n\n");

  // Collapse excessive spaces (but preserve single newlines)
  text = text.replace(/[ \t]{2,}/g, " ");

  // Trim again after normalization
  text = text.trim();

  const format = detectFormat(text);

  return { text, format };
}

function detectFormat(text: string): InputFormat {
  const markerCount = STRUCTURED_MARKERS.filter((re) => re.test(text)).length;

  // Has clear section headers like "Ingredients:" AND "Instructions:"
  if (markerCount >= 2) {
    return "structured";
  }

  // Has at least one section header or numbered/bulleted lists
  const hasLists = /^\s*[-*•]\s+/m.test(text) || /^\s*\d+[.)]\s+/m.test(text);
  if (markerCount >= 1 || hasLists) {
    return "semi-structured";
  }

  // Has paragraph breaks (multiple paragraphs separated by blank lines)
  // with a short title-like first line — indicates semi-structured prose recipe
  const paragraphs = text.split(/\n\n+/);
  if (paragraphs.length >= 3) {
    const firstLine = paragraphs[0].trim();
    const isTitleLike = firstLine.length < 80 && !firstLine.includes(".");
    if (isTitleLike) {
      return "semi-structured";
    }
  }

  return "unstructured";
}
