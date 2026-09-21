'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildInstructions, cleanMessage, instructionsPathSegments } = require('../src/message');
const { buildCliArguments, buildCliPrompt } = require('../src/codex-cli');
const { getModelForProvider } = require('../src/models');

test('instructions include repository guidance and require only a commit message', () => {
  const instructions = buildInstructions('Use Conventional Commits.');
  assert.match(instructions, /Use Conventional Commits/);
  assert.match(instructions, /only the final commit message/i);
  assert.match(instructions, /staged changes/i);
});

test('cleanMessage removes accidental Markdown fences', () => {
  assert.equal(cleanMessage('```text\n✨ feat: add search\n```'), '✨ feat: add search');
});

test('instruction path must remain within the repository', () => {
  assert.deepEqual(instructionsPathSegments('.github/commit-message.md'), ['.github', 'commit-message.md']);
  assert.throws(() => instructionsPathSegments('../outside.md'), /repository-relative/);
  assert.throws(() => instructionsPathSegments('/outside.md'), /repository-relative/);
});

test('CLI generation passes the prompt over stdin and keeps Codex read-only', () => {
  const args = buildCliArguments({ model: 'gpt-5.6-sol', outputPath: '/tmp/message.txt' });
  assert.deepEqual(args, [
    'exec', '--sandbox', 'read-only', '--skip-git-repo-check', '--color', 'never',
    '--ephemeral', '--output-last-message', '/tmp/message.txt', '--model', 'gpt-5.6-sol', '-'
  ]);
  const prompt = buildCliPrompt({ instructions: 'Use Conventional Commits.', stagedDiff: 'diff --git a/a b/a' });
  assert.match(prompt, /Use Conventional Commits/);
  assert.match(prompt, /Staged diff:/);
});

test('CLI default model does not pass --model to Codex', () => {
  const args = buildCliArguments({ model: 'default', outputPath: '/tmp/message.txt' });
  assert.deepEqual(args, [
    'exec', '--sandbox', 'read-only', '--skip-git-repo-check', '--color', 'never',
    '--ephemeral', '--output-last-message', '/tmp/message.txt', '-'
  ]);
});

test('the single model setting resolves default and validates the selected provider', () => {
  assert.equal(getModelForProvider('api', 'default'), 'gpt-5');
  assert.equal(getModelForProvider('cli', 'default'), 'default');
  assert.equal(getModelForProvider('api', 'gpt-5-mini'), 'gpt-5-mini');
  assert.equal(getModelForProvider('cli', 'gpt-5.6-sol'), 'gpt-5.6-sol');
  assert.throws(() => getModelForProvider('api', 'gpt-5.6-sol'), /not available/);
  assert.throws(() => getModelForProvider('cli', 'gpt-5'), /not available/);
});
