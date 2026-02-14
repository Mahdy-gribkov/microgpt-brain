/**
 * MicroGPT model — a minimal GPT implementation matching Karpathy's microGPT.
 * Character-level, no biases, RMSNorm, ReLU activation.
 */

import { Tensor } from './tensor';
import {
  linear,
  linearBackward,
  softmax,
  softmaxBackward,
  rmsNorm,
  rmsNormBackward,
  relu,
  reluBackward,
  add,
  scale,
  crossEntropyLoss,
  embeddingLookup,
  embeddingBackward,
} from './tensor-ops-cpu';

export interface GPTConfig {
  vocabSize: number;
  blockSize: number; // max context length
  nLayer: number;
  nHead: number;
  nEmbd: number;
}

export const DEFAULT_CONFIG: Omit<GPTConfig, 'vocabSize'> = {
  blockSize: 64,
  nLayer: 4,
  nHead: 4,
  nEmbd: 64,
};

interface LayerParams {
  attnWq: Tensor; // [nEmbd, nEmbd]
  attnWk: Tensor;
  attnWv: Tensor;
  attnWo: Tensor;
  mlpFc1: Tensor; // [4*nEmbd, nEmbd]
  mlpFc2: Tensor; // [nEmbd, 4*nEmbd]
}

/** Cache of intermediate values for backward pass */
interface LayerCache {
  xIn: Tensor;          // input to block
  xNorm1: Tensor;       // after first rmsNorm
  rms1: number;
  q: Tensor;            // query
  k: Tensor;            // key
  v: Tensor;            // value
  attnWeights: Tensor[];// [nHead] each [seqLen] (for current pos)
  attnOut: Tensor;      // after attention output projection
  xAfterAttn: Tensor;   // after residual add
  xNorm2: Tensor;       // after second rmsNorm
  rms2: number;
  fc1Out: Tensor;       // after first FFN layer (pre-relu)
  fc1Relu: Tensor;      // after relu
  x: Tensor;            // output of this layer (after FFN residual)
}

interface StepCache {
  tokenId: number;
  posId: number;
  tokEmb: Tensor;
  posEmb: Tensor;
  xInitNorm: Tensor;
  rmsInit: number;
  layers: LayerCache[];
}

/** Cross-position gradient contributions from a single backward step.
 *  When position P attends to V/K at positions 0..P, the weight gradients
 *  for attnWv/attnWk must be propagated through EACH position's xNorm1,
 *  not just the current position's. This structure carries the per-position
 *  dV and dK vectors so trainStep can do the second-pass accumulation. */
export interface CrossPositionGrads {
  dV: Tensor[][]; // [nLayer][seqLen] each [nEmbd]
  dK: Tensor[][]; // [nLayer][seqLen] each [nEmbd]
}

export class MicroGPT {
  config: GPTConfig;
  wte: Tensor;      // token embedding [vocabSize, nEmbd]
  wpe: Tensor;      // position embedding [blockSize, nEmbd]
  lmHead: Tensor;   // output projection [vocabSize, nEmbd]
  layers: LayerParams[];

  constructor(config: GPTConfig) {
    this.config = config;
    const { vocabSize, blockSize, nEmbd } = config;
    const std = 0.08;

    this.wte = Tensor.randn([vocabSize, nEmbd], std);
    this.wte.requiresGrad = true;
    this.wte.grad = Tensor.zeros([vocabSize, nEmbd]);

    this.wpe = Tensor.randn([blockSize, nEmbd], std);
    this.wpe.requiresGrad = true;
    this.wpe.grad = Tensor.zeros([blockSize, nEmbd]);

    this.lmHead = Tensor.randn([vocabSize, nEmbd], std);
    this.lmHead.requiresGrad = true;
    this.lmHead.grad = Tensor.zeros([vocabSize, nEmbd]);

    this.layers = [];
    for (let i = 0; i < config.nLayer; i++) {
      const layer: LayerParams = {
        attnWq: Tensor.randn([nEmbd, nEmbd], std),
        attnWk: Tensor.randn([nEmbd, nEmbd], std),
        attnWv: Tensor.randn([nEmbd, nEmbd], std),
        attnWo: Tensor.randn([nEmbd, nEmbd], std),
        mlpFc1: Tensor.randn([4 * nEmbd, nEmbd], std),
        mlpFc2: Tensor.randn([nEmbd, 4 * nEmbd], std),
      };
      // Enable gradients
      for (const w of Object.values(layer)) {
        (w as Tensor).requiresGrad = true;
        (w as Tensor).grad = Tensor.zeros((w as Tensor).shape);
      }
      this.layers.push(layer);
    }
  }

  /** Get all parameters for the optimizer */
  parameters(): Tensor[] {
    const params: Tensor[] = [this.wte, this.wpe, this.lmHead];
    for (const layer of this.layers) {
      params.push(
        layer.attnWq, layer.attnWk, layer.attnWv, layer.attnWo,
        layer.mlpFc1, layer.mlpFc2
      );
    }
    return params;
  }

  /** Count total parameters */
  paramCount(): number {
    return this.parameters().reduce((sum, p) => sum + p.size, 0);
  }

  /** Zero all gradients */
  zeroGrad(): void {
    for (const p of this.parameters()) {
      p.zeroGrad();
    }
  }

  /**
   * Forward pass for a single token at a given position.
   * Uses KV cache for causal attention.
   * Returns logits and cache for backward pass.
   */
  forward(
    tokenId: number,
    posId: number,
    kvKeys: Tensor[][],   // [nLayer][seqSoFar] each [nEmbd]
    kvValues: Tensor[][], // [nLayer][seqSoFar] each [nEmbd]
  ): { logits: Tensor; cache: StepCache } {
    const { nLayer, nHead, nEmbd } = this.config;
    const headDim = nEmbd / nHead;

    // Embeddings
    const tokEmb = embeddingLookup(this.wte, tokenId);
    const posEmb = embeddingLookup(this.wpe, posId);
    let x = add(tokEmb, posEmb);

    // Initial RMSNorm (matching Karpathy)
    const { out: xInitNorm, rms: rmsInit } = rmsNorm(x);
    x = xInitNorm;

    const layerCaches: LayerCache[] = [];

    for (let li = 0; li < nLayer; li++) {
      const layer = this.layers[li];
      const xIn = x;

      // Pre-attention RMSNorm
      const { out: xNorm1, rms: rms1 } = rmsNorm(x);

      // QKV projections
      const q = linear(xNorm1, layer.attnWq);
      const k = linear(xNorm1, layer.attnWk);
      const v = linear(xNorm1, layer.attnWv);

      // Store K,V in cache
      kvKeys[li].push(k);
      kvValues[li].push(v);

      // Multi-head attention
      const xAttnParts: number[] = [];
      const attnWeights: Tensor[] = [];

      for (let h = 0; h < nHead; h++) {
        const hs = h * headDim;

        // Extract head slices
        const qH = new Float32Array(headDim);
        for (let d = 0; d < headDim; d++) qH[d] = q.data[hs + d];

        // Compute attention scores against all cached keys
        const seqLen = kvKeys[li].length;
        const scores = new Float32Array(seqLen);
        const scaleFactor = 1 / Math.sqrt(headDim);

        for (let t = 0; t < seqLen; t++) {
          let dot = 0;
          for (let d = 0; d < headDim; d++) {
            dot += qH[d] * kvKeys[li][t].data[hs + d];
          }
          scores[t] = dot * scaleFactor;
        }

        // Softmax over scores
        const scoresTensor = new Tensor(scores, [seqLen]);
        const weights = softmax(scoresTensor);
        attnWeights.push(weights);

        // Weighted sum of values
        for (let d = 0; d < headDim; d++) {
          let sum = 0;
          for (let t = 0; t < seqLen; t++) {
            sum += weights.data[t] * kvValues[li][t].data[hs + d];
          }
          xAttnParts.push(sum);
        }
      }

      const xAttn = new Tensor(new Float32Array(xAttnParts), [nEmbd]);

      // Output projection
      const attnOut = linear(xAttn, layer.attnWo);

      // Residual connection
      const xAfterAttn = add(attnOut, xIn);

      // Pre-FFN RMSNorm
      const { out: xNorm2, rms: rms2 } = rmsNorm(xAfterAttn);

      // FFN
      const fc1Out = linear(xNorm2, layer.mlpFc1);
      const fc1Relu = relu(fc1Out);
      const fc2Out = linear(fc1Relu, layer.mlpFc2);

      // Residual connection
      x = add(fc2Out, xAfterAttn);

      layerCaches.push({
        xIn, xNorm1, rms1, q, k, v, attnWeights,
        attnOut, xAfterAttn, xNorm2, rms2,
        fc1Out, fc1Relu, x,
      });
    }

    // Output logits
    const logits = linear(x, this.lmHead);

    return {
      logits,
      cache: {
        tokenId, posId, tokEmb, posEmb,
        xInitNorm, rmsInit,
        layers: layerCaches,
      },
    };
  }

  /**
   * Backward pass for a single step.
   * Propagates gradient from dLogits back through the network.
   *
   * Returns per-position dV and dK contributions for cross-position gradient
   * accumulation. Each backward step at position `posInSeq` attends to V/K at
   * positions 0..posInSeq. The weight gradients for attnWv/attnWk at the current
   * position are handled here, but contributions targeting OTHER positions must be
   * accumulated in trainStep() and propagated through their cached xNorm1.
   */
  backward(
    dLogits: Tensor,
    cache: StepCache,
    kvKeys: Tensor[][],
    kvValues: Tensor[][],
    posInSeq: number,
  ): CrossPositionGrads {
    const { nLayer, nHead, nEmbd } = this.config;
    const headDim = nEmbd / nHead;
    const seqLen = posInSeq + 1;

    const crossGrads: CrossPositionGrads = {
      dV: Array.from({ length: nLayer }, () =>
        Array.from({ length: seqLen }, () => Tensor.zeros([nEmbd]))
      ),
      dK: Array.from({ length: nLayer }, () =>
        Array.from({ length: seqLen }, () => Tensor.zeros([nEmbd]))
      ),
    };

    // Get the final x (output of last layer) from cache
    const lastCache = cache.layers[cache.layers.length - 1];
    const finalX = lastCache.x;

    const { dX: dX_lm, dW: dW_lm } = linearBackward(dLogits, finalX, this.lmHead);
    // Accumulate lmHead gradient
    for (let i = 0; i < dW_lm.size; i++) {
      this.lmHead.grad!.data[i] += dW_lm.data[i];
    }

    let dX = dX_lm;

    // Backward through layers in reverse
    for (let li = nLayer - 1; li >= 0; li--) {
      const layer = this.layers[li];
      const lc = cache.layers[li];

      // Residual: dX flows to both fc2Out and xAfterAttn
      const dFc2Out = dX;
      const dXAfterAttn_res = dX;

      // FFN backward: fc2 <- relu <- fc1 <- rmsNorm2
      const { dX: dFc1Relu, dW: dW_fc2 } = linearBackward(dFc2Out, lc.fc1Relu, layer.mlpFc2);
      for (let i = 0; i < dW_fc2.size; i++) layer.mlpFc2.grad!.data[i] += dW_fc2.data[i];

      const dFc1Out = reluBackward(dFc1Relu, lc.fc1Out);

      const { dX: dXNorm2, dW: dW_fc1 } = linearBackward(dFc1Out, lc.xNorm2, layer.mlpFc1);
      for (let i = 0; i < dW_fc1.size; i++) layer.mlpFc1.grad!.data[i] += dW_fc1.data[i];

      const dXAfterAttn_norm = rmsNormBackward(dXNorm2, lc.xAfterAttn, lc.rms2);

      // Combine residual gradients
      const dXAfterAttn = add(dXAfterAttn_res, dXAfterAttn_norm);

      // Attention output projection backward
      // attnOut = linear(xAttn, attnWo)
      // Reconstruct xAttn from the attention computation
      const xAttnParts = new Float32Array(nEmbd);

      for (let h = 0; h < nHead; h++) {
        const hs = h * headDim;
        for (let d = 0; d < headDim; d++) {
          let sum = 0;
          for (let t = 0; t < seqLen; t++) {
            sum += lc.attnWeights[h].data[t] * kvValues[li][t].data[hs + d];
          }
          xAttnParts[hs + d] = sum;
        }
      }
      const xAttn = new Tensor(xAttnParts, [nEmbd]);

      const { dX: dAttnOut_x, dW: dW_wo } = linearBackward(dXAfterAttn, xAttn, layer.attnWo);
      for (let i = 0; i < dW_wo.size; i++) layer.attnWo.grad!.data[i] += dW_wo.data[i];

      // Residual from attention
      const dXIn_attn = dXAfterAttn;

      // Backward through multi-head attention
      // Compute per-position dV[t] and dK[t], and accumulated dQ
      const dQ = Tensor.zeros([nEmbd]);
      const scaleFactor = 1 / Math.sqrt(headDim);

      // Per-position dV and dK for this layer
      const layerDV = crossGrads.dV[li]; // already initialized as zeros
      const layerDK = crossGrads.dK[li];

      for (let h = 0; h < nHead; h++) {
        const hs = h * headDim;

        // Step 1: dAttnWeights[t] = sum_d(dAttnOut[hs+d] * V[t][hs+d])
        const dWeights = new Float32Array(seqLen);
        for (let t = 0; t < seqLen; t++) {
          let sum = 0;
          for (let d = 0; d < headDim; d++) {
            sum += dAttnOut_x.data[hs + d] * kvValues[li][t].data[hs + d];
          }
          dWeights[t] = sum;
        }

        // Step 2: dV[t][hs+d] = attnWeights[h][t] * dAttnOut[hs+d] (per position)
        for (let t = 0; t < seqLen; t++) {
          for (let d = 0; d < headDim; d++) {
            layerDV[t].data[hs + d] += lc.attnWeights[h].data[t] * dAttnOut_x.data[hs + d];
          }
        }

        // Step 3: Backprop through softmax
        const dWeightsTensor = new Tensor(dWeights, [seqLen]);
        const dScores = softmaxBackward(dWeightsTensor, lc.attnWeights[h]);

        // Step 4: dQ[hs+d] += sum_t(dScores[t] * K[t][hs+d]) * scaleFactor
        for (let t = 0; t < seqLen; t++) {
          for (let d = 0; d < headDim; d++) {
            dQ.data[hs + d] += dScores.data[t] * kvKeys[li][t].data[hs + d] * scaleFactor;
          }
        }

        // Step 5: dK[t][hs+d] = dScores[t] * Q[hs+d] * scaleFactor (per position)
        for (let t = 0; t < seqLen; t++) {
          for (let d = 0; d < headDim; d++) {
            layerDK[t].data[hs + d] += dScores.data[t] * lc.q.data[hs + d] * scaleFactor;
          }
        }
      }

      // Backprop through Q projection (Q is always from the current position)
      const { dX: dXN1_q, dW: dW_wq } = linearBackward(dQ, lc.xNorm1, layer.attnWq);
      for (let i = 0; i < dW_wq.size; i++) layer.attnWq.grad!.data[i] += dW_wq.data[i];

      // Backprop through K, V projections for CURRENT POSITION ONLY
      // (cross-position contributions are accumulated in trainStep's second pass)
      const dK_current = layerDK[posInSeq];
      const dV_current = layerDV[posInSeq];

      const { dX: dXN1_k, dW: dW_wk } = linearBackward(dK_current, lc.xNorm1, layer.attnWk);
      for (let i = 0; i < dW_wk.size; i++) layer.attnWk.grad!.data[i] += dW_wk.data[i];

      const { dX: dXN1_v, dW: dW_wv } = linearBackward(dV_current, lc.xNorm1, layer.attnWv);
      for (let i = 0; i < dW_wv.size; i++) layer.attnWv.grad!.data[i] += dW_wv.data[i];

      // RMSNorm backward for pre-attention norm (combine Q, K, V gradients)
      const dXNorm1_combined = add(add(dXN1_q, dXN1_k), dXN1_v);
      const dXFromNorm1 = rmsNormBackward(dXNorm1_combined, lc.xIn, lc.rms1);

      // Combine with residual
      dX = add(dXIn_attn, dXFromNorm1);
    }

    // Backward through initial RMSNorm
    const xPreNorm = add(cache.tokEmb, cache.posEmb);
    const dXPreNorm = rmsNormBackward(dX, xPreNorm, cache.rmsInit);

    // Embedding gradients
    embeddingBackward(dXPreNorm, this.wte, cache.tokenId);
    embeddingBackward(dXPreNorm, this.wpe, cache.posId);

    return crossGrads;
  }
}

/**
 * Run a single training step on one document.
 * Returns the average loss over the sequence.
 *
 * Two-pass backward:
 * 1. Per-position backward: propagates gradients for all layers except
 *    cross-position attnWk/attnWv contributions.
 * 2. Cross-position pass: accumulates dV[t] and dK[t] from all positions
 *    that attended to position t, then propagates through cached xNorm1[t].
 */
export function trainStep(
  model: MicroGPT,
  tokens: number[],
): number {
  const { nLayer, nEmbd, blockSize } = model.config;
  const n = Math.min(blockSize, tokens.length - 1);

  // Initialize KV cache
  const kvKeys: Tensor[][] = Array.from({ length: nLayer }, () => []);
  const kvValues: Tensor[][] = Array.from({ length: nLayer }, () => []);

  const caches: StepCache[] = [];
  const losses: number[] = [];
  const dLogitsList: Tensor[] = [];

  // Forward pass: process each position
  for (let pos = 0; pos < n; pos++) {
    const tokenId = tokens[pos];
    const targetId = tokens[pos + 1];

    const { logits, cache } = model.forward(tokenId, pos, kvKeys, kvValues);
    const { loss, dLogits } = crossEntropyLoss(logits, targetId);

    losses.push(loss);
    dLogitsList.push(scale(dLogits, 1 / n)); // scale by 1/n for average
    caches.push(cache);
  }

  const avgLoss = losses.reduce((a, b) => a + b, 0) / n;

  // Pass 1: Per-position backward (handles everything except cross-position K/V weight grads)
  model.zeroGrad();
  const allCrossGrads: CrossPositionGrads[] = [];
  for (let pos = n - 1; pos >= 0; pos--) {
    const crossGrads = model.backward(dLogitsList[pos], caches[pos], kvKeys, kvValues, pos);
    allCrossGrads[pos] = crossGrads;
  }

  // Pass 2: Accumulate cross-position V and K weight gradients.
  // For each position t, collect dV[t] and dK[t] from all backward steps
  // at positions pos > t (position t's own contribution was already handled).
  for (let li = 0; li < nLayer; li++) {
    const layer = model.layers[li];

    for (let t = 0; t < n; t++) {
      const totalDV = Tensor.zeros([nEmbd]);
      const totalDK = Tensor.zeros([nEmbd]);
      let hasContributions = false;

      // Sum contributions from positions that attend to position t
      for (let pos = t + 1; pos < n; pos++) {
        const cg = allCrossGrads[pos];
        // cg.dV[li] has entries for positions 0..pos, so index t is valid
        if (t < cg.dV[li].length) {
          const dv = cg.dV[li][t];
          const dk = cg.dK[li][t];
          for (let i = 0; i < nEmbd; i++) {
            totalDV.data[i] += dv.data[i];
            totalDK.data[i] += dk.data[i];
          }
          hasContributions = true;
        }
      }

      if (!hasContributions) continue;

      // Propagate through position t's cached xNorm1
      const xNorm1_t = caches[t].layers[li].xNorm1;

      const { dW: dW_wv } = linearBackward(totalDV, xNorm1_t, layer.attnWv);
      for (let i = 0; i < dW_wv.size; i++) {
        layer.attnWv.grad!.data[i] += dW_wv.data[i];
      }

      const { dW: dW_wk } = linearBackward(totalDK, xNorm1_t, layer.attnWk);
      for (let i = 0; i < dW_wk.size; i++) {
        layer.attnWk.grad!.data[i] += dW_wk.data[i];
      }
    }
  }

  return avgLoss;
}

/** Compute parameter count for a given config */
export function computeParamCount(config: Omit<GPTConfig, 'vocabSize'> & { vocabSize?: number }, vocabSize = 50): number {
  const vs = config.vocabSize ?? vocabSize;
  const { blockSize, nLayer, nEmbd } = config;
  const embParams = vs * nEmbd + blockSize * nEmbd; // wte + wpe
  // Per layer: Q[E,E] + K[E,E] + V[E,E] + O[E,E] + fc1[4E,E] + fc2[E,4E] = 12*E*E
  const totalLayerParams = nLayer * 12 * nEmbd * nEmbd;
  const lmHeadParams = vs * nEmbd;
  return embParams + totalLayerParams + lmHeadParams;
}
