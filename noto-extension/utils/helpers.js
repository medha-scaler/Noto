export function generateId(prefix = "noto") {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}

export function fuzzyMatchText(pageText, savedText, threshold = 0.6) {
  if (!pageText || !savedText) {
    return { isMatch: false, score: 0 };
  }

  const haystack = normalizeWhitespace(pageText);
  const needle = normalizeWhitespace(savedText);

  const index = haystack.indexOf(needle);
  if (index !== -1) {
    return { isMatch: true, score: 1, index };
  }

  const distance = levenshteinDistance(haystack, needle);
  const maxLen = Math.max(haystack.length, needle.length) || 1;
  const score = 1 - distance / maxLen;

  return { isMatch: score >= threshold, score };
}

export function getSelectionContext(selection, radius = 30) {
  if (!selection || !selection.anchorNode) {
    return { before: "", after: "" };
  }

  const anchorText = selection.anchorNode.textContent || "";
  const focusText = selection.focusNode?.textContent || "";
  const startOffset = Math.min(selection.anchorOffset, selection.focusOffset || 0);
  const endOffset = Math.max(selection.anchorOffset, selection.focusOffset || 0);

  const surrounding = anchorText === focusText ? anchorText : anchorText + focusText;

  const beforeStart = Math.max(0, startOffset - radius);
  const afterEnd = Math.min(surrounding.length, endOffset + radius);

  return {
    before: surrounding.slice(beforeStart, startOffset),
    after: surrounding.slice(endOffset, afterEnd),
  };
}

export function debounce(fn, delay = 200) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function levenshteinDistance(a, b) {
  const matrix = [];

  for (let i = 0; i <= b.length; i += 1) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i += 1) {
    for (let j = 1; j <= a.length; j += 1) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}
