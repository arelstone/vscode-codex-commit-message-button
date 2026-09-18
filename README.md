# Codex Commit Button

A deliberately small VS Code extension that adds a sparkle button to the Source Control title bar. Clicking it reads the staged diff and repository commit instructions, sends them to the OpenAI Responses API, and populates the Git commit input box.

## Install

1. In VS Code, run **Extensions: Install from VSIX…**.
2. Select `codex-commit-button-0.1.0.vsix` and reload VS Code.

## Use

1. Stage your changes.
2. Open Source Control.
3. Click the sparkle button in the Source Control title bar and enter an OpenAI API key when prompted.
4. Review the generated message before committing.

By default, the extension reads:

```text
.claude/instructions/commit-instructions.md
```

Set `codexCommitButton.instructionsFile` to a repository-relative path if your instructions live elsewhere, for example `".github/commit-message.md"`. Set `codexCommitButton.model` to choose the Responses API model. Use **Codex: Set OpenAI API Key** or **Codex: Clear OpenAI API Key** to manage the key.

## Security

The API key is stored only in VS Code Secret Storage, never in settings or logs. The extension sends the staged diff and repository instruction file directly to the Responses API with response storage disabled. It never runs `git commit`; the generated message is only placed in the input box.

## Continue development locally

```bash
npm install
npm test
code .
```

Press `F5` in VS Code to launch an Extension Development Host. Build an installable package with `npm run package`.
