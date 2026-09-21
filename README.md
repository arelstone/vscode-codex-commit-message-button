# Codex Commit Button

A deliberately small VS Code extension that adds a sparkle button to the Source Control title bar. Clicking it reads the staged diff and repository commit instructions, generates a message through either the OpenAI Responses API or Codex CLI, and populates the Git commit input box.

## Install

1. In VS Code, run **Extensions: Install from VSIX…**.
2. Select `codex-commit-button-0.1.0.vsix` and reload VS Code.

## Use

1. Stage your changes, then open Source Control.
2. Click the sparkle button in the Source Control title bar. With the default API provider, enter an OpenAI API key when prompted; with the CLI provider, make sure `codex` is installed and logged in.
3. Review the generated message before committing.

## Defaults and configuration

The extension uses these defaults:

| Setting | Default | Purpose |
| --- | --- | --- |
| `codexCommitButton.provider` | `api` | Use `api` for the OpenAI Responses API or `cli` for the locally installed Codex CLI. |
| `codexCommitButton.model` | `default` | Model used with the selected provider. `default` uses `gpt-5` for API or your signed-in CLI configuration for CLI. |
| `codexCommitButton.instructionsFile` | `.instructions/commit-instructions.md` | Repository-relative commit-message instructions file. |
| `codexCommitButton.timeoutSeconds` | `120` | Maximum time to wait for a response. |

Set `codexCommitButton.provider` to `cli` to use your local Codex CLI login instead of an API key. `codexCommitButton.model` is one dropdown for both providers: leave it at `default` unless you need a particular model. In CLI mode, `default` omits `--model`, so it remains compatible with the available models for the logged-in CLI account. Selecting a model unavailable for the chosen provider shows an actionable error. The extension runs `codex exec` with a read-only sandbox and uses its final message only. Set `codexCommitButton.instructionsFile` to a repository-relative path if your instructions live elsewhere, for example `".github/commit-message.md"`. Use **Codex: Set OpenAI API Key** or **Codex: Clear OpenAI API Key** to manage the API key.

## Security

For the API provider, the API key is stored only in VS Code Secret Storage, never in settings or logs; the extension sends the staged diff and repository instruction file directly to the Responses API with response storage disabled. For the CLI provider, Codex receives the same inputs through its local CLI and is restricted to a read-only sandbox. Neither provider runs `git commit`; the generated message is only placed in the input box.

## Continue development locally

```bash
npm install
npm test
code .
```

Press `F5` in VS Code to launch an Extension Development Host. Build an installable package with `npm run package`.
