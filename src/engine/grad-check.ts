/**
 * Numerical gradient checking utility (development only).
 * Compares analytical gradients from backward() against numerical gradients
 * computed via finite differences.
 *
 * Usage: call gradCheck() with a small model and short sequence.
 * Returns max relative error across all parameters.
 */

import { MicroGPT, trainStep, type GPTConfig } from './model';
import { Tensor } from './tensor';

interface GradCheckResult {
  maxRelError: number;
  paramErrors: Array<{
    name: string;
    maxRelError: number;
    analyticalNorm: number;
    numericalNorm: number;
  }>;
  passed: boolean;
}

/**
 * Run numerical gradient check on a tiny model.
 * Creates a small model, runs a forward+backward pass, then compares
 * analytical gradients against finite-difference numerical gradients.
 *
 * @param eps - Perturbation size for finite differences (default 1e-4)
 * @param tolerance - Max acceptable relative error (default 1e-3)
 */
export function gradCheck(eps = 1e-4, tolerance = 1e-3): GradCheckResult {
  // Create a tiny model for testing
  const config: GPTConfig = {
    vocabSize: 8,
    blockSize: 8,
    nLayer: 1,
    nHead: 2,
    nEmbd: 8,
  };

  // Fixed seed sequence for reproducibility
  const tokens = [0, 1, 2, 3, 1, 2];

  // Step 1: Compute analytical gradients
  const model = new MicroGPT(config);

  // Save initial weights for later comparison
  const savedWeights: Float32Array[] = model.parameters().map(p =>
    new Float32Array(p.data)
  );

  trainStep(model, tokens);
  const analyticalGrads: Float32Array[] = model.parameters().map(p =>
    new Float32Array(p.grad!.data)
  );

  // Step 2: Compute numerical gradients via finite differences
  const paramNames = getParamNames(config);
  const paramErrors: GradCheckResult['paramErrors'] = [];
  let globalMaxRelError = 0;

  const params = model.parameters();
  for (let pi = 0; pi < params.length; pi++) {
    const param = params[pi];
    // Restore original weights
    param.data.set(savedWeights[pi]);

    let maxRelError = 0;
    let analyticalNorm = 0;
    let numericalNorm = 0;

    // Check a subset of elements for large parameters
    const indicesToCheck = param.size <= 64
      ? Array.from({ length: param.size }, (_, i) => i)
      : sampleIndices(param.size, 32);

    for (const idx of indicesToCheck) {
      // f(x + eps)
      param.data.set(savedWeights[pi]);
      param.data[idx] += eps;
      const lossPlus = computeLoss(model, config, tokens);

      // f(x - eps)
      param.data.set(savedWeights[pi]);
      param.data[idx] -= eps;
      const lossMinus = computeLoss(model, config, tokens);

      // Restore
      param.data.set(savedWeights[pi]);

      const numericalGrad = (lossPlus - lossMinus) / (2 * eps);
      const analyticalGrad = analyticalGrads[pi][idx];

      analyticalNorm += analyticalGrad * analyticalGrad;
      numericalNorm += numericalGrad * numericalGrad;

      const diff = Math.abs(numericalGrad - analyticalGrad);
      const denom = Math.max(Math.abs(numericalGrad), Math.abs(analyticalGrad), 1e-8);
      const relError = diff / denom;

      if (relError > maxRelError) {
        maxRelError = relError;
      }
    }

    analyticalNorm = Math.sqrt(analyticalNorm);
    numericalNorm = Math.sqrt(numericalNorm);

    paramErrors.push({
      name: paramNames[pi] ?? `param_${pi}`,
      maxRelError,
      analyticalNorm,
      numericalNorm,
    });

    if (maxRelError > globalMaxRelError) {
      globalMaxRelError = maxRelError;
    }
  }

  return {
    maxRelError: globalMaxRelError,
    paramErrors,
    passed: globalMaxRelError < tolerance,
  };
}

/** Compute loss without accumulating gradients */
function computeLoss(model: MicroGPT, config: GPTConfig, tokens: number[]): number {
  // trainStep modifies gradients, so we just need the loss
  // We need a clean forward pass
  const { nLayer, blockSize } = config;
  const n = Math.min(blockSize, tokens.length - 1);

  const kvKeys: Tensor[][] = Array.from({ length: nLayer }, () => []);
  const kvValues: Tensor[][] = Array.from({ length: nLayer }, () => []);

  let totalLoss = 0;
  for (let pos = 0; pos < n; pos++) {
    const { logits } = model.forward(tokens[pos], pos, kvKeys, kvValues);
    const targetId = tokens[pos + 1];

    // Compute cross-entropy loss manually
    const maxLogit = Math.max(...Array.from(logits.data));
    let sumExp = 0;
    for (let i = 0; i < logits.size; i++) {
      sumExp += Math.exp(logits.data[i] - maxLogit);
    }
    const logProb = logits.data[targetId] - maxLogit - Math.log(sumExp);
    totalLoss += -logProb;
  }

  return totalLoss / n;
}

function getParamNames(config: GPTConfig): string[] {
  const names = ['wte', 'wpe', 'lmHead'];
  for (let i = 0; i < config.nLayer; i++) {
    names.push(
      `layer${i}.attnWq`, `layer${i}.attnWk`, `layer${i}.attnWv`, `layer${i}.attnWo`,
      `layer${i}.mlpFc1`, `layer${i}.mlpFc2`
    );
  }
  return names;
}

function sampleIndices(total: number, count: number): number[] {
  const indices: number[] = [];
  const step = Math.max(1, Math.floor(total / count));
  for (let i = 0; i < total && indices.length < count; i += step) {
    indices.push(i);
  }
  return indices;
}
