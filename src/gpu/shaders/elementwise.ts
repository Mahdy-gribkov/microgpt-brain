/**
 * WGSL elementwise shaders: ReLU, add, scale.
 */

export const reluShader = /* wgsl */ `
struct Params {
  N: u32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> input: array<f32>;
@group(0) @binding(2) var<storage, read_write> output: array<f32>;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let idx = gid.x;
  if (idx < params.N) {
    output[idx] = max(0.0, input[idx]);
  }
}
`;

export const addShader = /* wgsl */ `
struct Params {
  N: u32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> A: array<f32>;
@group(0) @binding(2) var<storage, read> B: array<f32>;
@group(0) @binding(3) var<storage, read_write> C: array<f32>;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let idx = gid.x;
  if (idx < params.N) {
    C[idx] = A[idx] + B[idx];
  }
}
`;

export const scaleShader = /* wgsl */ `
struct Params {
  N: u32,
  scalar: f32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> input: array<f32>;
@group(0) @binding(2) var<storage, read_write> output: array<f32>;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let idx = gid.x;
  if (idx < params.N) {
    output[idx] = input[idx] * params.scalar;
  }
}
`;
