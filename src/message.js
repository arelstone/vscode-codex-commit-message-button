'use strict';

function buildInstructions(repositoryInstructions) {
  return [
    'Generate a Git commit message for the staged changes in this repository.',
    'Follow these repository commit-message instructions exactly:',
    repositoryInstructions,
    'Return only the final commit message: no Markdown fences, explanation, or preamble.',
    'Do not include any text other than the commit message.'
  ].join('\n\n');
}

function instructionsPathSegments(instructionsFile) {
  if (typeof instructionsFile !== 'string' || !instructionsFile.trim()) {
    throw new Error('codexCommitButton.instructionsFile must be a non-empty repository-relative path.');
  }
  const normalized = instructionsFile.trim().replace(/\\/g, '/');
  const segments = normalized.split('/').filter(Boolean);
  if (normalized.startsWith('/') || /^[A-Za-z]:\//.test(normalized) || segments.includes('..')) {
    throw new Error('codexCommitButton.instructionsFile must be a repository-relative path.');
  }
  return segments;
}

function cleanMessage(value) {
  return String(value || '')
    .trim()
    .replace(/^```(?:text)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

module.exports = { buildInstructions, cleanMessage, instructionsPathSegments };
