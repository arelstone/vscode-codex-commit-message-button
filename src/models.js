'use strict';

const API_MODELS = new Set(['gpt-5', 'gpt-5-mini', 'gpt-5-nano']);
const CLI_MODELS = new Set(['gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-5.6-luna']);

function getModelForProvider(provider, model = 'default') {
  if (model === 'default') return provider === 'api' ? 'gpt-5' : 'default';
  const validModels = provider === 'api' ? API_MODELS : CLI_MODELS;
  if (!validModels.has(model)) {
    throw new Error(`codexCommitButton.model "${model}" is not available for the ${provider.toUpperCase()} provider.`);
  }
  return model;
}

module.exports = { getModelForProvider };
