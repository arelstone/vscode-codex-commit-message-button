'use strict';

const manifest = require('../package.json');

const modelSetting = manifest.contributes.configuration.properties['codexCommitButton.model'];
const defaultModel = modelSetting.default;
const providerMetadata = modelSetting.modelProviderMetadata;

function validateModelMetadata() {
  const configuredModels = new Set(modelSetting.enum);
  if (!providerMetadata || typeof providerMetadata !== 'object'
    || !['api', 'cli'].every((provider) => providerMetadata[provider])) {
    throw new Error('codexCommitButton.model metadata must define API and CLI providers.');
  }
  const providers = Object.values(providerMetadata);
  if (providers.some(({ models, default: providerDefault }) => !Array.isArray(models)
    || typeof providerDefault !== 'string'
    || (providerDefault !== defaultModel && !models.includes(providerDefault)))) {
    throw new Error('codexCommitButton.model provider defaults must be configured models.');
  }
  const metadataModels = providers.flatMap(({ models }) => models);
  if (!configuredModels.has(defaultModel)
    || new Set(metadataModels).size !== metadataModels.length
    || metadataModels.some((model) => !configuredModels.has(model))
    || configuredModels.size !== metadataModels.length + 1) {
    throw new Error('codexCommitButton.model metadata must match its dropdown enum.');
  }
}

validateModelMetadata();

function getModelForProvider(provider, model = defaultModel) {
  const providerModels = providerMetadata[provider];
  if (!providerModels) throw new Error(`Unknown model provider: ${provider}`);
  if (model === defaultModel) return providerModels.default;
  if (!providerModels.models.includes(model)) {
    throw new Error(`codexCommitButton.model "${model}" is not available for the ${provider.toUpperCase()} provider.`);
  }
  return model;
}

module.exports = { getModelForProvider };
