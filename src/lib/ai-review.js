const MIN_WORDS = 30;

// Style profile extracted from the user-supplied AI-written junior developer CV.
// These are broad phrase families and layout signals, not an exact-text fingerprint.
const SUPPLIED_CV_REFERENCE = {
  label: 'generic junior developer CV',
  phraseGroups: [
    {
      label: 'polished profile language',
      phrases: ['motivated and detail-oriented', 'strong interest in', 'enjoy solving technical problems', 'particularly interested in', 'continuously expand my technical knowledge'],
    },
    {
      label: 'broad project claims without named examples',
      phrases: ['gained practical experience by developing independent', 'projects involved implementing', 'working on personal projects has helped me understand the importance'],
    },
    {
      label: 'generic personal strengths',
      phrases: ['quick learner', 'responsible team member', 'patience and determination', 'value constructive feedback', 'continuous improvement'],
    },
    {
      label: 'standardized career objective',
      phrases: ['contribute to real-world projects', 'gradually take on more complex', 'strengthen my programming skills'],
    },
  ],
  sectionHeadings: [
    'professional profile', 'technical skills', 'experience and projects',
    'personal strengths', 'career objective',
  ],
};

const COMMON_AI_PHRASES = [
  'as an ai', 'in conclusion', 'furthermore', 'moreover',
  'it is important to note', 'delve into', 'robust solution',
  'seamlessly', 'i hope this helps', 'comprehensive overview',
];

function wordsIn(text) {
  return text.match(/[\p{L}\p{N}’'-]+/gu) ?? [];
}

export function analyzeText(text) {
  const value = String(text ?? '').trim();
  const words = wordsIn(value);
  if (words.length < MIN_WORDS) {
    return { score: null, confidence: 'insufficient', reasons: [`At least ${MIN_WORDS} words are needed for a useful pattern check.`] };
  }

  const lower = value.toLowerCase().replace(/\s+/g, ' ');
  const matchedReferenceGroups = SUPPLIED_CV_REFERENCE.phraseGroups.filter((group) =>
    group.phrases.some((phrase) => lower.includes(phrase)),
  );
  const commonPhraseHits = COMMON_AI_PHRASES.filter((phrase) => lower.includes(phrase));
  const normalizedHeadings = value.split(/\r?\n/)
    .map((line) => line.replace(/^\s*#+\s*/, '').replace(/[*_]/g, '').trim().toLowerCase())
    .filter(Boolean);
  const headingHits = SUPPLIED_CV_REFERENCE.sectionHeadings.filter((heading) => normalizedHeadings.includes(heading));

  const sentences = value.split(/[.!?]+/).map((part) => part.trim()).filter(Boolean);
  const sentenceLengths = sentences.map((sentence) => wordsIn(sentence).length).filter(Boolean);
  const average = sentenceLengths.reduce((sum, length) => sum + length, 0) / Math.max(sentenceLengths.length, 1);
  const variance = sentenceLengths.reduce((sum, length) => sum + (length - average) ** 2, 0) / Math.max(sentenceLengths.length, 1);
  const starters = sentences.map((sentence) => sentence.split(/\s+/).slice(0, 2).join(' ').toLowerCase());
  const repeatedStarters = starters.length - new Set(starters).size;
  const firstPersonCount = sentences.filter((sentence) => /^(i|my)\b/i.test(sentence)).length;
  const hasConcreteEvidence = /https?:\/\/|www\.|\b\d+(?:[.,]\d+)?\s*(?:%|years?|months?|users?|downloads?|projects?)?\b/i.test(value);

  let score = 0;
  score += Math.min(matchedReferenceGroups.length, 4) * 10;
  score += Math.min(commonPhraseHits.length, 4) * 8;
  if (headingHits.length >= 3) score += 18;
  else if (headingHits.length === 2) score += 10;
  else if (headingHits.length === 1) score += 4;
  if (matchedReferenceGroups.length >= 2 && headingHits.length >= 3 && !hasConcreteEvidence) score += 16;
  if (variance < 18 && sentences.length >= 6) score += 10;
  if (repeatedStarters >= 2) score += 8;
  if (sentences.length >= 6 && firstPersonCount / sentences.length >= 0.45) score += 6;
  score = Math.min(100, score);

  const reasons = [];
  if (matchedReferenceGroups.length) reasons.push(`Matched ${matchedReferenceGroups.length} broad style group(s) from the supplied ${SUPPLIED_CV_REFERENCE.label} reference.`);
  if (headingHits.length >= 2) reasons.push(`Found ${headingHits.length} familiar CV section headings in a highly structured layout.`);
  if (matchedReferenceGroups.length >= 2 && headingHits.length >= 3 && !hasConcreteEvidence) reasons.push('Several claims are broad and lack quantified evidence, dates, or links.');
  if (commonPhraseHits.length) reasons.push(`Found ${commonPhraseHits.length} generic transition or filler phrase pattern(s).`);
  if (variance < 18 && sentences.length >= 6) reasons.push('Sentence lengths are unusually consistent.');
  if (repeatedStarters >= 2) reasons.push('Several sentences repeat the same opening pattern.');
  if (!reasons.length) reasons.push('No configured writing-pattern flags were found.');

  return { score, confidence: 'low', reasons, referenceGroups: matchedReferenceGroups.map(({ label }) => label), wordCount: words.length };
}

export function reviewApplication(fields) {
  const entries = Object.entries(fields ?? {}).filter(([, value]) => String(value).trim());
  const wordCount = entries.reduce((sum, [, value]) => sum + wordsIn(String(value)).length, 0);
  const applicationScore = Math.max(1, Math.min(100, Math.round(1 + entries.length * 14 + Math.min(wordCount, 250) * 0.18)));
  const fieldReviews = entries.map(([label, value]) => ({ label, ...analyzeText(value) }));
  const usable = fieldReviews.map((review) => review.score).filter((score) => score != null);
  const patternScore = usable.length ? Math.round(usable.reduce((sum, score) => sum + score, 0) / usable.length) : null;
  const reasons = [`${entries.length} form field(s) completed.`, `${wordCount} words submitted.`];
  if (!entries.length) reasons.push('No saved form answers were found.');
  if (wordCount < MIN_WORDS) reasons.push(`Add more detail for a more useful human review; the detector needs at least ${MIN_WORDS} words.`);
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
