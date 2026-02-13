/**
 * Autoregressive text generation using a trained MicroGPT model.
 */

import { Tensor } from './tensor';
import { MicroGPT } from './model';
import { CharTokenizer } from './tokenizer';
import { softmax, scale } from './tensor-ops-cpu';

/** Sample from a probability distribution */
function sampleFromProbs(probs: Tensor): number {
  const r = Math.random();
  let cumSum = 0;
  for (let i = 0; i < probs.size; i++) {
    cumSum += probs.data[i];
    if (r <= cumSum) return i;
  }
  return probs.size - 1;
}

/**
 * Generate text from a trained model.
 * Starts with BOS token and generates until BOS is produced again or maxTokens reached.
 */
export function generate(
  model: MicroGPT,
  tokenizer: CharTokenizer,
  maxTokens: number,
  temperature: number = 0.8,
): string {
  const { nLayer, blockSize } = model.config;

  // Initialize KV cache
  const kvKeys: Tensor[][] = Array.from({ length: nLayer }, () => []);
  const kvValues: Tensor[][] = Array.from({ length: nLayer }, () => []);

  let tokenId = tokenizer.bosToken;
  const generated: number[] = [];

  for (let pos = 0; pos < Math.min(maxTokens, blockSize); pos++) {
    const { logits } = model.forward(tokenId, pos, kvKeys, kvValues);

    // Apply temperature
    const scaledLogits = temperature !== 1.0
      ? scale(logits, 1 / temperature)
      : logits;

    const probs = softmax(scaledLogits);
    tokenId = sampleFromProbs(probs);

    // Stop if BOS token generated
    if (tokenId === tokenizer.bosToken) break;

    generated.push(tokenId);
  }

  return tokenizer.decode(generated);
}
