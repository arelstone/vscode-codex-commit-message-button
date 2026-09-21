'use strict';

const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { buildInstructions } = require('./message');

function buildCliArguments({ model, outputPath }) {
  const args = [
    'exec',
    '--sandbox', 'read-only',
    '--skip-git-repo-check',
    '--color', 'never',
    '--ephemeral',
    '--output-last-message', outputPath
  ];
  // "default" deliberately lets the signed-in Codex CLI choose its configured model.
  if (model && model !== 'default') args.push('--model', model);
  args.push('-');
  return args;
}

function buildCliPrompt({ instructions, stagedDiff }) {
  return `${buildInstructions(instructions)}\n\nStaged diff:\n${stagedDiff}`;
}

async function requestCommitMessageFromCli({ model, instructions, stagedDiff, timeoutMs, token, cwd }) {
  const outputDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-commit-message-'));
  const outputPath = path.join(outputDirectory, 'message.txt');
  let child;
  let timedOut = false;
  let cancelled = false;

  try {
    await new Promise((resolve, reject) => {
      let stderr = '';
      const stop = () => child?.kill();
      const cancellation = token.onCancellationRequested(() => {
        cancelled = true;
        stop();
      });
      const timer = setTimeout(() => {
        timedOut = true;
        stop();
      }, timeoutMs);

      const finish = (error) => {
        clearTimeout(timer);
        cancellation.dispose();
        error ? reject(error) : resolve();
      };

      try {
        child = spawn('codex', buildCliArguments({ model, outputPath }), { cwd, stdio: ['pipe', 'ignore', 'pipe'] });
      } catch (error) {
        finish(error);
        return;
      }
      child.stderr.on('data', (chunk) => { stderr += chunk; });
      child.on('error', finish);
      child.on('close', (code) => {
        if (timedOut) return finish(new Error(`Codex CLI timed out after ${Math.round(timeoutMs / 1000)} seconds.`));
        if (cancelled) return finish(Object.assign(new Error('Cancelled'), { name: 'AbortError' }));
        if (code !== 0) return finish(new Error(`Codex CLI exited with code ${code}.${stderr.trim() ? ` ${stderr.trim()}` : ''}`));
        finish();
      });
      child.stdin.end(buildCliPrompt({ instructions, stagedDiff }));
    });
    return await fs.readFile(outputPath, 'utf8');
  } finally {
    await fs.rm(outputDirectory, { recursive: true, force: true });
  }
}

module.exports = { buildCliArguments, buildCliPrompt, requestCommitMessageFromCli };
