/**
 * WGSL shaders for attention computation.
 * Shader 1: Compute attention scores (Q @ K^T / sqrt(d))
 * Shader 2: Weighted sum of values (attn_weights @ V)
 */

export const attnScoresShader = /* wgsl */ `
struct Params {
  seqLen: u32,
  headDim: u32,
  nHead: u32,
  scale: f32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> Q: array<f32>;  // [nEmbd]
@group(0) @binding(2) var<storage, read> K: array<f32>;  // [seqLen * nEmbd]
@group(0) @binding(3) var<storage, read_write> scores: array<f32>; // [nHead * seqLen]

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let idx = gid.x;
  let totalScores = params.nHead * params.seqLen;
  if (idx >= totalScores) { return; }

  let h = idx / params.seqLen;
  let t = idx % params.seqLen;
  let headStart = h * params.headDim;

  var dot: f32 = 0.0;
  for (var d: u32 = 0u; d < params.headDim; d = d + 1u) {
    let qIdx = headStart + d;
    let kIdx = t * (params.nHead * params.headDim) + headStart + d;
    dot = dot + Q[qIdx] * K[kIdx];
  }

  scores[idx] = dot * params.scale;
}
`;

export const attnWeightedSumShader = /* wgsl */ `
struct Params {
  seqLen: u32,
  headDim: u32,
  nHead: u32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> weights: array<f32>; // [nHead * seqLen]
@group(0) @binding(2) var<storage, read> V: array<f32>;       // [seqLen * nEmbd]
@group(0) @binding(3) var<storage, read_write> output: array<f32>; // [nEmbd]

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let idx = gid.x;
  let nEmbd = params.nHead * params.headDim;
  if (idx >= nEmbd) { return; }

  let h = idx / params.headDim;
  let d = idx % params.headDim;

  var sum: f32 = 0.0;
  for (var t: u32 = 0u; t < params.seqLen; t = t + 1u) {
    let w = weights[h * params.seqLen + t];
    let vIdx = t * nEmbd + h * params.headDim + d;
    sum = sum + w * V[vIdx];
  }

  output[idx] = sum;
}
`;
