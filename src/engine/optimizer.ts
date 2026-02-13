/**
 * Adam optimizer matching Karpathy's microGPT implementation.
 * Operates directly on Tensor parameters.
 */

import { Tensor } from './tensor';

export interface AdamConfig {
  lr: number;
  beta1: number;
  beta2: number;
  eps: number;
  maxSteps: number;
}

export const DEFAULT_ADAM: AdamConfig = {
  lr: 0.01,
  beta1: 0.85,
  beta2: 0.99,
  eps: 1e-8,
  maxSteps: 1000,
};

export class AdamOptimizer {
  config: AdamConfig;
  m: Float32Array[]; // first moments
  v: Float32Array[]; // second moments
  t: number;         // step counter

  constructor(params: Tensor[], config: AdamConfig = DEFAULT_ADAM) {
    this.config = config;
    this.t = 0;
    this.m = params.map((p) => new Float32Array(p.size));
    this.v = params.map((p) => new Float32Array(p.size));
  }

  step(params: Tensor[]): void {
    this.t++;
    const { lr, beta1, beta2, eps, maxSteps } = this.config;
    // Linear learning rate decay (matching Karpathy)
    const lrT = lr * Math.max(0, 1 - (this.t - 1) / maxSteps);

    for (let pi = 0; pi < params.length; pi++) {
      const p = params[pi];
      if (!p.grad) continue;

      const m = this.m[pi];
      const v = this.v[pi];
      const g = p.grad.data;

      for (let i = 0; i < p.size; i++) {
        m[i] = beta1 * m[i] + (1 - beta1) * g[i];
        v[i] = beta2 * v[i] + (1 - beta2) * g[i] * g[i];
        const mHat = m[i] / (1 - Math.pow(beta1, this.t));
        const vHat = v[i] / (1 - Math.pow(beta2, this.t));
        p.data[i] -= lrT * mHat / (Math.sqrt(vHat) + eps);
      }
    }
  }
}
