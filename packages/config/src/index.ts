export type {
  Severity,
  RuleConfigEntry,
  WorldReadyConfig,
} from './types.js';

export { DEFAULT_CONFIG } from './defaults.js';
export { loadConfig } from './loader.js';
export { detectFramework } from './detector.js';
export { initConfig } from './init.js';
