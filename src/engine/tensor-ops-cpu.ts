/**
 * CPU tensor operations for the GPT engine.
 * Pure TypeScript, no dependencies.
 */

import { Tensor } from './tensor';

/** Matrix multiply: [M, K] x [K, N] -> [M, N] */
export function matmul(a: Tensor, b: Tensor): Tensor {
  const M = a.shape[0];
  const K = a.shape[1];
  const N = b.shape[1];
  const out = Tensor.zeros([M, N]);

  for (let i = 0; i < M; i++) {
    for (let j = 0; j < N; j++) {
      let sum = 0;
      const aOff = i * K;
      for (let k = 0; k < K; k++) {
        sum += a.data[aOff + k] * b.data[k * N + j];
      }
      out.data[i * N + j] = sum;
    }
  }
  return out;
}

/** Matrix multiply backward: dOut [M,N], A [M,K], B [K,N] -> dA [M,K], dB [K,N] */
export function matmulBackward(
  dOut: Tensor,
  a: Tensor,
  b: Tensor
): { dA: Tensor; dB: Tensor } {
  const M = a.shape[0];
  const K = a.shape[1];
  const N = b.shape[1];
  const dA = Tensor.zeros([M, K]);
  const dB = Tensor.zeros([K, N]);

  // dA = dOut @ B^T
  for (let i = 0; i < M; i++) {
    for (let k = 0; k < K; k++) {
      let sum = 0;
      for (let j = 0; j < N; j++) {
        sum += dOut.data[i * N + j] * b.data[k * N + j];
      }
      dA.data[i * K + k] = sum;
    }
  }

  // dB = A^T @ dOut
  for (let k = 0; k < K; k++) {
    for (let j = 0; j < N; j++) {
      let sum = 0;
      for (let i = 0; i < M; i++) {
        sum += a.data[i * K + k] * dOut.data[i * N + j];
      }
      dB.data[k * N + j] = sum;
    }
  }

  return { dA, dB };
}

/** Vector-matrix multiply: x [K] @ W [outDim, K]^T -> [outDim] (linear layer, no bias) */
export function linear(x: Tensor, w: Tensor): Tensor {
  const outDim = w.shape[0];
  const inDim = w.shape[1];
  const out = Tensor.zeros([outDim]);

  for (let i = 0; i < outDim; i++) {
    let sum = 0;
    const wOff = i * inDim;
    for (let j = 0; j < inDim; j++) {
      sum += w.data[wOff + j] * x.data[j];
    }
    out.data[i] = sum;
  }
  return out;
}

/** Linear backward: dOut [outDim], x [inDim], w [outDim, inDim] */
export function linearBackward(
  dOut: Tensor,
  x: Tensor,
  w: Tensor
): { dX: Tensor; dW: Tensor } {
  const outDim = w.shape[0];
  const inDim = w.shape[1];
  const dX = Tensor.zeros([inDim]);
  const dW = Tensor.zeros([outDim, inDim]);

  // dX = W^T @ dOut
  for (let j = 0; j < inDim; j++) {
    let sum = 0;
    for (let i = 0; i < outDim; i++) {
      sum += w.data[i * inDim + j] * dOut.data[i];
    }
    dX.data[j] = sum;
  }

  // dW = dOut outer x
  for (let i = 0; i < outDim; i++) {
    for (let j = 0; j < inDim; j++) {
      dW.data[i * inDim + j] = dOut.data[i] * x.data[j];
    }
  }

  return { dX, dW };
}

/** Softmax over a 1D tensor */
export function softmax(x: Tensor): Tensor {
  const n = x.size;
  const out = Tensor.zeros([n]);

  let maxVal = -Infinity;
  for (let i = 0; i < n; i++) {
    if (x.data[i] > maxVal) maxVal = x.data[i];
  }

  let sumExp = 0;
  for (let i = 0; i < n; i++) {
    out.data[i] = Math.exp(x.data[i] - maxVal);
    sumExp += out.data[i];
  }

  for (let i = 0; i < n; i++) {
    out.data[i] /= sumExp;
  }
  return out;
}

/** Softmax backward: dOut [N], softmaxOutput [N] -> dInput [N] */
export function softmaxBackward(dOut: Tensor, softmaxOut: Tensor): Tensor {
  const n = dOut.size;
  const dInput = Tensor.zeros([n]);

  // dot = sum(dOut * softmaxOut)
  let dot = 0;
  for (let i = 0; i < n; i++) {
    dot += dOut.data[i] * softmaxOut.data[i];
  }

  // dInput[i] = softmaxOut[i] * (dOut[i] - dot)
  for (let i = 0; i < n; i++) {
    dInput.data[i] = softmaxOut.data[i] * (dOut.data[i] - dot);
  }
  return dInput;
}

/** RMS Normalization (no learned weight, matching Karpathy's simple version) */
export function rmsNorm(x: Tensor, eps = 1e-5): { out: Tensor; rms: number } {
  const n = x.size;
  let sumSq = 0;
  for (let i = 0; i < n; i++) {
    sumSq += x.data[i] * x.data[i];
  }
  const rms = Math.sqrt(sumSq / n + eps);
  const out = Tensor.zeros([n]);
  for (let i = 0; i < n; i++) {
    out.data[i] = x.data[i] / rms;
  }
  return { out, rms };
}

/** RMS Norm backward: dOut [N], input [N], rms scalar */
export function rmsNormBackward(dOut: Tensor, input: Tensor, rms: number): Tensor {
  const n = input.size;
  const dInput = Tensor.zeros([n]);

  // d(x/rms)/dx = 1/rms - x^2 / (n * rms^3)
  let dotXdOut = 0;
  for (let i = 0; i < n; i++) {
    dotXdOut += input.data[i] * dOut.data[i];
  }
  const rms3 = rms * rms * rms;

  for (let i = 0; i < n; i++) {
    dInput.data[i] = dOut.data[i] / rms - input.data[i] * dotXdOut / (n * rms3);
  }
  return dInput;
}

/** ReLU activation */
export function relu(x: Tensor): Tensor {
  const out = Tensor.zeros(x.shape);
  for (let i = 0; i < x.size; i++) {
    out.data[i] = Math.max(0, x.data[i]);
  }
  return out;
}

/** ReLU backward */
export function reluBackward(dOut: Tensor, input: Tensor): Tensor {
  const dInput = Tensor.zeros(input.shape);
  for (let i = 0; i < input.size; i++) {
    dInput.data[i] = input.data[i] > 0 ? dOut.data[i] : 0;
  }
  return dInput;
}

/** Element-wise add: a + b (same shape) */
export function add(a: Tensor, b: Tensor): Tensor {
  const out = Tensor.zeros(a.shape);
  for (let i = 0; i < a.size; i++) {
    out.data[i] = a.data[i] + b.data[i];
  }
  return out;
}

/** Scale tensor by scalar */
export function scale(x: Tensor, s: number): Tensor {
  const out = Tensor.zeros(x.shape);
  for (let i = 0; i < x.size; i++) {
    out.data[i] = x.data[i] * s;
  }
  return out;
}

/** Cross-entropy loss: -log(probs[target]) */
export function crossEntropyLoss(logits: Tensor, target: number): { loss: number; dLogits: Tensor } {
  const probs = softmax(logits);
  const loss = -Math.log(probs.data[target] + 1e-10);

  // Gradient: probs - one_hot(target)
  const dLogits = new Tensor(new Float32Array(probs.data), [...probs.shape]);
  dLogits.data[target] -= 1;
  return { loss, dLogits };
}

/** Embedding lookup: table [vocabSize, dim], index -> [dim] */
export function embeddingLookup(table: Tensor, index: number): Tensor {
  const dim = table.shape[1];
  const offset = index * dim;
  const out = new Tensor(new Float32Array(dim), [dim]);
  for (let i = 0; i < dim; i++) {
    out.data[i] = table.data[offset + i];
  }
  return out;
}

/** Accumulate gradient into embedding table at given index */
export function embeddingBackward(grad: Tensor, table: Tensor, index: number): void {
  const dim = table.shape[1];
  const offset = index * dim;
  if (!table.grad) return;
  for (let i = 0; i < dim; i++) {
    table.grad.data[offset + i] += grad.data[i];
  }
}
