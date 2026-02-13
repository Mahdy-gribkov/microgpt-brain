/**
 * CPU backend — thin wrapper delegating to tensor-ops-cpu.ts.
 */

import type { ComputeBackend } from './backend';
import { Tensor } from './tensor';
import * as ops from './tensor-ops-cpu';

export class CpuBackend implements ComputeBackend {
  readonly name = 'cpu' as const;

  matmul(a: Tensor, b: Tensor): Tensor {
    return ops.matmul(a, b);
  }

  linear(x: Tensor, w: Tensor): Tensor {
    return ops.linear(x, w);
  }

  softmax(x: Tensor): Tensor {
    return ops.softmax(x);
  }

  rmsNorm(x: Tensor, eps?: number): { out: Tensor; rms: number } {
    return ops.rmsNorm(x, eps);
  }

  relu(x: Tensor): Tensor {
    return ops.relu(x);
  }

  add(a: Tensor, b: Tensor): Tensor {
    return ops.add(a, b);
  }

  scale(x: Tensor, s: number): Tensor {
    return ops.scale(x, s);
  }
}
