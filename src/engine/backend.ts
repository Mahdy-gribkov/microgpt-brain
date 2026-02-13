/**
 * ComputeBackend interface — abstraction over CPU and GPU tensor operations.
 * CPU ops are synchronous; GPU ops may be async (readback from GPU).
 */

import { Tensor } from './tensor';

export interface ComputeBackend {
  readonly name: 'cpu' | 'webgpu';

  matmul(a: Tensor, b: Tensor): Tensor | Promise<Tensor>;
  linear(x: Tensor, w: Tensor): Tensor | Promise<Tensor>;
  softmax(x: Tensor): Tensor | Promise<Tensor>;
  rmsNorm(x: Tensor, eps?: number): { out: Tensor; rms: number } | Promise<{ out: Tensor; rms: number }>;
  relu(x: Tensor): Tensor | Promise<Tensor>;
  add(a: Tensor, b: Tensor): Tensor | Promise<Tensor>;
  scale(x: Tensor, s: number): Tensor | Promise<Tensor>;
}
