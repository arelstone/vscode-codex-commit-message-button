'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildInstructions, cleanMessage, instructionsPathSegments } = require('../src/message');

test('instructions include repository guidance and require only a commit message', () => {
  const instructions = buildInstructions('Use Conventional Commits.');
  assert.match(instructions, /Use Conventional Commits/);
  assert.match(instructions, /only the final commit message/i);
  assert.doesNotMatch(instructions, /git diff --cached/);
});

test('cleanMessage removes accidental Markdown fences', () => {
  assert.equal(cleanMessage('```text\n✨ feat: add search\n```'), '✨ feat: add search');
});

test('instruction path must remain within the repository', () => {
  assert.deepEqual(instructionsPathSegments('.github/commit-message.md'), ['.github', 'commit-message.md']);
  assert.throws(() => instructionsPathSegments('../outside.md'), /repository-relative/);
  assert.throws(() => instructionsPathSegments('/outside.md'), /repository-relative/);
});
