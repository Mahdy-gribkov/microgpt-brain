/**
 * WGSL shader for RMS normalization.
 * Computes: out[i] = x[i] / sqrt(mean(x^2) + eps)
 */

export const rmsnormShader = /* wgsl */ `
struct Params {
  N: u32,
  eps: f32,
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

  // Sum of squares (parallel reduction)
  var localSum: f32 = 0.0;
  var i: u32 = tid;
  while (i < N) {
    let val = input[i];
    localSum = localSum + val * val;
    i = i + WG_SIZE;
  }
  shared[tid] = localSum;
  workgroupBarrier();

  var stride: u32 = WG_SIZE / 2u;
  while (stride > 0u) {
    if (tid < stride) {
      shared[tid] = shared[tid] + shared[tid + stride];
    }
    workgroupBarrier();
    stride = stride / 2u;
  }

  let rms = sqrt(shared[0] / f32(N) + params.eps);
  workgroupBarrier();

  // Normalize
  i = tid;
  while (i < N) {
    output[i] = input[i] / rms;
    i = i + WG_SIZE;
  }
}
`;
