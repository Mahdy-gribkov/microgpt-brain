/**
 * Input sanitization and validation for public deployment.
 * All training text and model configs pass through these before reaching the engine.
 */

import { SECURITY_LIMITS } from './constants';

/** Strip HTML tags and null bytes from training text */
export function sanitizeText(input: unknown): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }

  // Remove null bytes
  let text = input.replace(/\0/g, '');

  // Strip HTML tags (simple regex, we never render as HTML)
  text = text.replace(/<[^>]*>/g, '');

  // Enforce max length
  if (text.length > SECURITY_LIMITS.maxInputTextLength) {
    throw new Error(`Input text too long: ${text.length} > ${SECURITY_LIMITS.maxInputTextLength}`);
  }

  if (text.length === 0) {
    throw new Error('Input text cannot be empty');
  }

  return text;
}

/** Validate model config with strict whitelist */
export function validateModelConfig(config: unknown): {
  nLayer: number;
  nHead: number;
  nEmbd: number;
  blockSize: number;
} {
  if (config === null || typeof config !== 'object') {
    throw new Error('Model config must be an object');
  }

  // Prevent prototype pollution
  const safe = Object.create(null) as Record<string, unknown>;
  const allowedKeys = ['nLayer', 'nHead', 'nEmbd', 'blockSize'];
  const src = config as Record<string, unknown>;

  for (const key of allowedKeys) {
    if (!(key in src)) {
      throw new Error(`Missing required config key: ${key}`);
    }
    const val = src[key];
    if (typeof val !== 'number' || !Number.isFinite(val)) {
      throw new Error(`Config key ${key} must be a finite number`);
    }
    safe[key] = val;
  }

  // Reject dangerous keys
  for (const key of Object.keys(src)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      throw new Error(`Forbidden config key: ${key}`);
    }
  }

  const { nLayer, nHead, nEmbd, blockSize } = safe as {
    nLayer: number;
    nHead: number;
    nEmbd: number;
    blockSize: number;
  };

  if (nLayer < 1 || nLayer > 8) throw new Error(`nLayer must be 1-8, got ${nLayer}`);
  if (nHead < 1 || nHead > 8) throw new Error(`nHead must be 1-8, got ${nHead}`);
  if (nEmbd < 16 || nEmbd > 256) throw new Error(`nEmbd must be 16-256, got ${nEmbd}`);
  if (nEmbd % nHead !== 0) throw new Error(`nEmbd (${nEmbd}) must be divisible by nHead (${nHead})`);
  if (blockSize < 16 || blockSize > 128) throw new Error(`blockSize must be 16-128, got ${blockSize}`);

  return { nLayer, nHead, nEmbd, blockSize };
}

/** Validate Adam optimizer config */
export function validateAdamConfig(config: unknown): {
  lr: number;
  maxSteps: number;
} {
  if (config === null || typeof config !== 'object') {
    throw new Error('Adam config must be an object');
  }

  const src = config as Record<string, unknown>;
  const lr = src.lr;
  const maxSteps = src.maxSteps;

  if (typeof lr !== 'number' || !Number.isFinite(lr)) {
    throw new Error('lr must be a finite number');
  }
  if (typeof maxSteps !== 'number' || !Number.isFinite(maxSteps)) {
    throw new Error('maxSteps must be a finite number');
  }

  if (lr <= 0 || lr > 0.05) throw new Error(`lr must be (0, 0.05], got ${lr}`);
  if (maxSteps < 1 || maxSteps > 2000) throw new Error(`maxSteps must be 1-2000, got ${maxSteps}`);

  return { lr, maxSteps };
}

/** Estimate memory usage in MB for a model config */
export function estimateMemoryMB(config: { nLayer: number; nEmbd: number; vocabSize?: number }): number {
  const vs = config.vocabSize ?? 100;
  const { nLayer, nEmbd } = config;
  const paramCount = vs * nEmbd * 2 + nLayer * 12 * nEmbd * nEmbd + vs * nEmbd;
  // weights + gradients + optimizer state (m + v) = 4x
  return (paramCount * 4 * 4) / 1e6;
}
