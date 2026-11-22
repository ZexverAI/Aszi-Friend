const AI_LIKE_PHRASES = [
  'as an ai', 'in conclusion', 'furthermore', 'moreover', 'it is important to note',
  'delve into', 'robust solution', 'seamlessly', 'I hope this helps', 'comprehensive overview',
];

export function analyzeText(text) {
  const value = String(text ?? '').trim();
  const words = value.match(/[\p{L}\p{N}’'-]+/gu) ?? [];
  if (words.length < 30) return { score: null, confidence: 'insufficient', reasons: ['At least 30 words are needed for a useful pattern check.'] };
  const lower = value.toLowerCase();
  const phrases = AI_LIKE_PHRASES.filter((phrase) => lower.includes(phrase));
  const sentences = value.split(/[.!?]+/).map((part) => part.trim()).filter(Boolean);
  const lengths = sentences.map((sentence) => (sentence.match(/[\p{L}\p{N}’'-]+/gu) ?? []).length);
  const average = lengths.reduce((sum, n) => sum + n, 0) / Math.max(lengths.length, 1);
  const variance = lengths.reduce((sum, n) => sum + (n - average) ** 2, 0) / Math.max(lengths.length, 1);
  const repeatedOpeners = sentences.map((sentence) => sentence.split(/\s+/).slice(0, 2).join(' ').toLowerCase());
  const repetition = repeatedOpeners.length - new Set(repeatedOpeners).size;
  const score = Math.min(100, phrases.length * 12 + (variance < 12 ? 18 : 0) + repetition * 10 + (sentences.length > 4 && average > 32 ? 12 : 0));
  const reasons = [];
  if (phrases.length) reasons.push(`Found ${phrases.length} generic phrase pattern(s).`);
  if (variance < 12) reasons.push('Sentence lengths are unusually consistent.');
  if (repetition) reasons.push('Several sentences use the same opening.');
  if (!reasons.length) reasons.push('No configured writing-pattern flags were found.');
  return { score, confidence: 'low', reasons };
}

export function reviewApplication(fields) {
  const entries = Object.entries(fields ?? {}).filter(([, value]) => String(value).trim());
  const wordCount = entries.reduce((sum, [, value]) => sum + (String(value).match(/[\p{L}\p{N}’'-]+/gu) ?? []).length, 0);
  const applicationScore = Math.max(1, Math.min(100, Math.round(20 + entries.length * 12 + Math.min(wordCount, 250) * 0.18)));
  const fieldReviews = entries.map(([label, value]) => ({ label, ...analyzeText(value) }));
  const usable = fieldReviews.map((review) => review.score).filter((score) => score != null);
  const patternScore = usable.length ? Math.round(usable.reduce((sum, score) => sum + score, 0) / usable.length) : null;
  const reasons = [`${entries.length} form field(s) completed.`, `${wordCount} words submitted.`];
  if (!entries.length) reasons.push('No saved form answers were found.');
  if (wordCount < 30) reasons.push('Add more detail for a more useful human review.');
  return { applicationScore, patternScore, reasons, fieldReviews };
}

export function renderSemicircle(score) {
  if (score == null) return 'Not enough text to score';
  const points = [];
  for (let row = 0; row < 4; row++) for (let col = 0; col < 13; col++) {
    const x = (col - 6) / 6;
    const y = (3 - row) / 4;
    const radius = Math.sqrt(x * x + y * y);
    if (radius > 0.83 && radius < 1.18) points.push({ row, col, angle: Math.atan2(y, x) });
  }
  const ordered = points.sort((a, b) => a.angle - b.angle);
  const filled = new Set(ordered.slice(0, Math.round(ordered.length * score / 100)).map((point) => `${point.row}:${point.col}`));
  return Array.from({ length: 4 }, (_, row) => {
    let line = '  ';
    for (let col = 0; col < 13; col++) {
      const x = (col - 6) / 6;
      const y = (3 - row) / 4;
      const radius = Math.sqrt(x * x + y * y);
      line += radius > 0.83 && radius < 1.18 ? (filled.has(`${row}:${col}`) ? '🟦' : '▫️') : '  ';
    }
    return line.trimEnd();
  }).join('\n');
}
