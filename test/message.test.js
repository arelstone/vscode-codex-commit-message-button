'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildInstructions, cleanMessage, instructionsPathSegments } = require('../src/message');
const { buildCliArguments, buildCliPrompt, cliExitError } = require('../src/codex-cli');
const { getModelForProvider } = require('../src/models');
const manifest = require('../package.json');

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

test('CLI errors expose the model failure without the banner or staged prompt', () => {
  const failure = `ERROR: ${JSON.stringify({ error: { message: "The 'gpt-5.6-sol' model is not supported when using Codex with a ChatGPT account." } })}`;
  const error = cliExitError(1, `OpenAI Codex v0.159.3\nuser\nPRIVATE STAGED DIFF\n${failure}\n${failure}\n`);
  assert.match(error.message, /model is not supported/);
  assert.match(error.message, /codexCommitButton.model/);
  assert.match(error.message, /inherits your Codex CLI configuration/);
  assert.doesNotMatch(error.message, /PRIVATE|OpenAI Codex|ERROR:|invalid_request_error/);
  assert.equal(error.message.split('ChatGPT account.').length, 2);
});

test('CLI errors retain plain diagnostics and handle missing diagnostics', () => {
  assert.equal(cliExitError(1, 'user\nPRIVATE DIFF\nError: Authentication failed\n').message,
    'Codex CLI exited with code 1. Authentication failed');
  assert.equal(cliExitError(2, 'user\nPRIVATE DIFF\n').message,
    'Codex CLI exited with code 2. Check your Codex CLI login and configuration.');
});

test('the model text input resolves provider defaults and accepts custom model names', () => {
  const modelSetting = manifest.contributes.configuration.properties['codexCommitButton.model'];
  const { api, cli } = modelSetting.modelProviderMetadata;
  assert.equal(getModelForProvider('api', modelSetting.default), api.default);
  assert.equal(getModelForProvider('cli', modelSetting.default), cli.default);
  assert.equal(modelSetting.type, 'string');
  assert.equal(modelSetting.enum, undefined);
  for (const provider of ['api', 'cli']) {
    assert.equal(getModelForProvider(provider, 'custom-model'), 'custom-model');
    assert.equal(getModelForProvider(provider, '  custom-model  '), 'custom-model');
    assert.equal(getModelForProvider(provider, ' default '), provider === 'api' ? api.default : cli.default);
    for (const invalid of ['', '  ', null, 42]) {
      assert.throws(() => getModelForProvider(provider, invalid), /non-empty model name/);
    }
  }
  assert.throws(() => getModelForProvider('unknown', 'custom-model'), /Unknown model provider/);
  assert.throws(() => getModelForProvider('toString', 'custom-model'), /Unknown model provider/);
});
