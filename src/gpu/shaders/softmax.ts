/**
 * WGSL shader for softmax — two-pass approach.
 * Pass 1: Find max value (reduction).
 * Pass 2: Compute exp(x - max) and normalize.
 * For small vectors (< 256 elements), runs in a single workgroup.
 */

export const softmaxShader = /* wgsl */ `
struct Params {
  N: u32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> input: array<f32>;
@group(0) @binding(2) var<storage, read_write> output: array<f32>;

const WG_SIZE: u32 = 256u;

var<workgroup> shared: array<f32, 256>;

@compute @workgroup_size(256)
fn main(
  @builtin(local_invocation_id) lid: vec3<u32>,
) {
  let tid = lid.x;
  let N = params.N;

  // Pass 1: Find max (parallel reduction)
  var localMax: f32 = -3.402823e+38; // -FLT_MAX
  var i: u32 = tid;
  while (i < N) {
    localMax = max(localMax, input[i]);
    i = i + WG_SIZE;
  }
  shared[tid] = localMax;
  workgroupBarrier();

  // Tree reduction for max
  var stride: u32 = WG_SIZE / 2u;
  while (stride > 0u) {
    if (tid < stride) {
      shared[tid] = max(shared[tid], shared[tid + stride]);
    }
    workgroupBarrier();
    stride = stride / 2u;
  }
  let maxVal = shared[0];
  workgroupBarrier();

  // Pass 2: exp(x - max) and sum
  var localSum: f32 = 0.0;
  i = tid;
  while (i < N) {
    let val = exp(input[i] - maxVal);
    output[i] = val;
    localSum = localSum + val;
    i = i + WG_SIZE;
  }
  shared[tid] = localSum;
  workgroupBarrier();

  // Tree reduction for sum
  stride = WG_SIZE / 2u;
  while (stride > 0u) {
    if (tid < stride) {
      shared[tid] = shared[tid] + shared[tid + stride];
    }
    workgroupBarrier();
    stride = stride / 2u;
  }
  let sumExp = shared[0];
  workgroupBarrier();

  // Normalize
  i = tid;
  while (i < N) {
    output[i] = output[i] / sumExp;
    i = i + WG_SIZE;
  }
}
`;
