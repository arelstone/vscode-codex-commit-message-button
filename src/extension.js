'use strict';

const vscode = require('vscode');
const OpenAI = require('openai');
const path = require('node:path');
const { buildInstructions, cleanMessage, instructionsPathSegments } = require('./message');

const API_KEY_SECRET = 'codexCommitButton.openaiApiKey';
const DEFAULT_INSTRUCTIONS_FILE = '.claude/instructions/commit-instructions.md';

async function getGitApi() {
  const extension = vscode.extensions.getExtension('vscode.git');
  if (!extension) throw new Error('The built-in Git extension is unavailable.');
  const exports = extension.isActive ? extension.exports : await extension.activate();
  return exports.getAPI(1);
}

async function chooseRepository(repositories) {
  if (repositories.length === 0) throw new Error('Open a Git repository first.');
  if (repositories.length === 1) return repositories[0];

  const activePath = vscode.window.activeTextEditor?.document.uri.fsPath;
  if (activePath) {
    const match = repositories.find((repository) =>
      activePath === repository.rootUri.fsPath ||
      activePath.startsWith(repository.rootUri.fsPath + path.sep)
    );
    if (match) return match;
  }

  const selection = await vscode.window.showQuickPick(
    repositories.map((repository) => ({
      label: vscode.workspace.asRelativePath(repository.rootUri),
      description: repository.rootUri.fsPath,
      repository
    })),
    { placeHolder: 'Select the repository' }
  );
  return selection?.repository;
}

async function promptForApiKey() {
  return vscode.window.showInputBox({ title: 'Set OpenAI API Key', prompt: 'Enter an OpenAI API key. It is stored only in VS Code Secret Storage.', password: true, ignoreFocusOut: true });
}

async function getApiKey(secrets) {
  const existingKey = await secrets.get(API_KEY_SECRET);
  if (existingKey) return existingKey;
  const apiKey = await promptForApiKey();
  if (!apiKey?.trim()) throw Object.assign(new Error('An OpenAI API key is required.'), { name: 'AbortError' });
  await secrets.store(API_KEY_SECRET, apiKey.trim());
  return apiKey.trim();
}

async function readRepositoryInputs(repository, instructionsFile) {
  const stagedDiff = await repository.diff(true);
  if (!stagedDiff.trim()) {
    vscode.window.showInformationMessage('Codex Commit: stage some changes first.');
    return undefined;
  }
  const instructionsUri = vscode.Uri.joinPath(
    repository.rootUri,
    ...instructionsPathSegments(instructionsFile)
  );
  let instructions;
  try {
    instructions = Buffer.from(await vscode.workspace.fs.readFile(instructionsUri)).toString('utf8');
  } catch (error) {
    if (error?.code === 'FileNotFound') throw new Error(`${instructionsFile} was not found in the selected repository.`);
    throw error;
  }
  if (!instructions.trim()) throw new Error(`${instructionsFile} is empty.`);
  return { instructions, stagedDiff };
}

async function requestCommitMessage({ apiKey, model, instructions, stagedDiff, timeoutMs, token }) {
  const controller = new AbortController();
  const cancellation = token.onCancellationRequested(() => controller.abort());
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  try {
    const response = await new OpenAI({ apiKey }).responses.create({ model, instructions: buildInstructions(instructions), input: stagedDiff, store: false }, { signal: controller.signal });
    return response.output_text;
  } catch (error) {
    if (timedOut) throw new Error(`OpenAI timed out after ${Math.round(timeoutMs / 1000)} seconds.`);
    if (controller.signal.aborted || error?.name === 'AbortError' || error?.name === 'APIUserAbortError') throw Object.assign(new Error('Cancelled'), { name: 'AbortError' });
    throw error;
  } finally {
    clearTimeout(timer);
    cancellation.dispose();
  }
}

async function generate(secrets) {
  const git = await getGitApi();
  const repository = await chooseRepository(git.repositories);
  if (!repository) return;

  const config = vscode.workspace.getConfiguration('codexCommitButton', repository.rootUri);
  const instructionsFile = config.get('instructionsFile', DEFAULT_INSTRUCTIONS_FILE);
  const inputs = await readRepositoryInputs(repository, instructionsFile);
  if (!inputs) return;
  const timeoutMs = config.get('timeoutSeconds', 120) * 1000;
  const apiKey = await getApiKey(secrets);

  const rawMessage = await vscode.window.withProgress({
    location: vscode.ProgressLocation.SourceControl,
    title: 'Codex is writing a commit message…',
    cancellable: true
  }, (_progress, token) => requestCommitMessage({
    apiKey,
    model: config.get('model', 'gpt-5'),
    instructions: inputs.instructions,
    stagedDiff: inputs.stagedDiff,
    timeoutMs,
    token
  }));

  const message = cleanMessage(rawMessage);
  if (!message) throw new Error('The OpenAI response did not contain a commit message.');
  repository.inputBox.value = message;
}

async function setApiKey(secrets) {
  const apiKey = await promptForApiKey();
  if (!apiKey?.trim()) return;
  await secrets.store(API_KEY_SECRET, apiKey.trim());
  vscode.window.showInformationMessage('Codex Commit: OpenAI API key saved in Secret Storage.');
}

async function clearApiKey(secrets) {
  await secrets.delete(API_KEY_SECRET);
  vscode.window.showInformationMessage('Codex Commit: OpenAI API key cleared.');
}

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('codexCommitButton.generate', () =>
      generate(context.secrets).catch((error) => {
        if (error?.name === 'AbortError') return;
        vscode.window.showErrorMessage(`Codex Commit: ${error?.message || String(error)}`);
      })
    ),
    vscode.commands.registerCommand('codexCommitButton.setApiKey', () => setApiKey(context.secrets)),
    vscode.commands.registerCommand('codexCommitButton.clearApiKey', () => clearApiKey(context.secrets))
  );
}

function deactivate() {}

module.exports = { activate, deactivate, API_KEY_SECRET, readRepositoryInputs, requestCommitMessage };
