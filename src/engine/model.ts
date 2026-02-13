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
        const he = hs + headDim;

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
   */
  backward(
    dLogits: Tensor,
    cache: StepCache,
    kvKeys: Tensor[][],
    kvValues: Tensor[][],
    posInSeq: number,
  ): void {
    const { nLayer, nHead, nEmbd } = this.config;
    const headDim = nEmbd / nHead;

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
      // We need to reconstruct xAttn from the attention computation
      const xAttnParts = new Float32Array(nEmbd);
      const seqLen = posInSeq + 1; // kvKeys[li] has this many entries at this point

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

      // Backward through multi-head attention to get dQ, dK, dV
      const dQ = Tensor.zeros([nEmbd]);
      const dK_acc = Tensor.zeros([nEmbd]);
      const dV_acc = Tensor.zeros([nEmbd]);

      const scaleFactor = 1 / Math.sqrt(headDim);

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

        // Step 2: dV[t][hs+d] += attnWeights[h][t] * dAttnOut[hs+d]
        for (let t = 0; t < seqLen; t++) {
          for (let d = 0; d < headDim; d++) {
            dV_acc.data[hs + d] += lc.attnWeights[h].data[t] * dAttnOut_x.data[hs + d];
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

        // Step 5: dK[t][hs+d] += dScores[t] * Q[hs+d] * scaleFactor
        // Note: we accumulate dK for the current position only (t = posInSeq)
        // since K at other positions were computed in earlier forward steps
        for (let d = 0; d < headDim; d++) {
          dK_acc.data[hs + d] += dScores.data[posInSeq] * lc.q.data[hs + d] * scaleFactor;
        }
      }

      // Backprop through Q, K, V projections
      const { dX: dXN1_q, dW: dW_wq } = linearBackward(dQ, lc.xNorm1, layer.attnWq);
      for (let i = 0; i < dW_wq.size; i++) layer.attnWq.grad!.data[i] += dW_wq.data[i];

      const { dX: dXN1_k, dW: dW_wk } = linearBackward(dK_acc, lc.xNorm1, layer.attnWk);
      for (let i = 0; i < dW_wk.size; i++) layer.attnWk.grad!.data[i] += dW_wk.data[i];

      const { dX: dXN1_v, dW: dW_wv } = linearBackward(dV_acc, lc.xNorm1, layer.attnWv);
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
  }
}

/**
 * Run a single training step on one document.
 * Returns the average loss over the sequence.
 */
export function trainStep(
  model: MicroGPT,
  tokens: number[],
): number {
  const { nLayer, blockSize } = model.config;
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

  // Backward pass: process in reverse
  model.zeroGrad();
  for (let pos = n - 1; pos >= 0; pos--) {
    model.backward(dLogitsList[pos], caches[pos], kvKeys, kvValues, pos);
  }

  return avgLoss;
}

/** Compute parameter count for a given config */
export function computeParamCount(config: Omit<GPTConfig, 'vocabSize'> & { vocabSize?: number }, vocabSize = 50): number {
  const vs = config.vocabSize ?? vocabSize;
  const { blockSize, nLayer, nHead: _, nEmbd } = config;
  const embParams = vs * nEmbd + blockSize * nEmbd; // wte + wpe
  const layerParams = nLayer * (
    4 * nEmbd * nEmbd +  // attnWq, attnWk, attnWv, attnWo
    4 * nEmbd * nEmbd +  // mlpFc1 (4*nEmbd x nEmbd)
    nEmbd * 4 * nEmbd    // mlpFc2 (nEmbd x 4*nEmbd)
  );
  // Wait, mlpFc1 is [4*nEmbd, nEmbd] and mlpFc2 is [nEmbd, 4*nEmbd]
  // So layerParams per layer = 4*nEmbd*nEmbd (Q) + nEmbd*nEmbd (K) + nEmbd*nEmbd (V) + nEmbd*nEmbd (O) + 4*nEmbd*nEmbd (fc1) + nEmbd*4*nEmbd (fc2)
  // = nEmbd*nEmbd * (1+1+1+1+4+4) = nEmbd*nEmbd * 12
  const correctedLayerParams = nLayer * 12 * nEmbd * nEmbd;
  const lmHeadParams = vs * nEmbd;
  return embParams + correctedLayerParams + lmHeadParams;
}
