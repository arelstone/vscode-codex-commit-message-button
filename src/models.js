'use strict';

const manifest = require('../package.json');

const modelSetting = manifest.contributes.configuration.properties['codexCommitButton.model'];
const defaultModel = modelSetting.default;
const providerMetadata = modelSetting.modelProviderMetadata;

function getModelForProvider(provider, model = defaultModel) {
  if (!Object.hasOwn(providerMetadata, provider)) throw new Error(`Unknown model provider: ${provider}`);
  if (typeof model !== 'string' || !model.trim()) {
    throw new Error('codexCommitButton.model must be a non-empty model name or "default".');
  }
  const modelName = model.trim();
  return modelName === defaultModel ? providerMetadata[provider].default : modelName;
}

module.exports = { getModelForProvider };
