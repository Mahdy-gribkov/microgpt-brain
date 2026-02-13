/**
 * WGSL shader for matrix multiplication: C = A @ B
 * A: [M, K], B: [K, N] -> C: [M, N]
 * Uses 16x16 tiled workgroups for efficiency.
 */

export const matmulShader = /* wgsl */ `
struct Dims {
  M: u32,
  K: u32,
  N: u32,
}

@group(0) @binding(0) var<uniform> dims: Dims;
@group(0) @binding(1) var<storage, read> A: array<f32>;
@group(0) @binding(2) var<storage, read> B: array<f32>;
@group(0) @binding(3) var<storage, read_write> C: array<f32>;

const TILE_SIZE: u32 = 16u;

var<workgroup> tileA: array<f32, 256>; // 16 * 16
var<workgroup> tileB: array<f32, 256>;

@compute @workgroup_size(16, 16)
fn main(
  @builtin(global_invocation_id) gid: vec3<u32>,
  @builtin(local_invocation_id) lid: vec3<u32>,
  @builtin(workgroup_id) wid: vec3<u32>,
) {
  let row = gid.y;
  let col = gid.x;
  let localRow = lid.y;
  let localCol = lid.x;

  var sum: f32 = 0.0;
  let numTiles = (dims.K + TILE_SIZE - 1u) / TILE_SIZE;

  for (var t: u32 = 0u; t < numTiles; t = t + 1u) {
    // Load tile of A
    let aCol = t * TILE_SIZE + localCol;
    if (row < dims.M && aCol < dims.K) {
      tileA[localRow * TILE_SIZE + localCol] = A[row * dims.K + aCol];
    } else {
      tileA[localRow * TILE_SIZE + localCol] = 0.0;
    }

    // Load tile of B
    let bRow = t * TILE_SIZE + localRow;
    if (bRow < dims.K && col < dims.N) {
      tileB[localRow * TILE_SIZE + localCol] = B[bRow * dims.N + col];
    } else {
      tileB[localRow * TILE_SIZE + localCol] = 0.0;
    }

    workgroupBarrier();

    // Compute partial dot product
    for (var k: u32 = 0u; k < TILE_SIZE; k = k + 1u) {
      sum = sum + tileA[localRow * TILE_SIZE + k] * tileB[k * TILE_SIZE + localCol];
    }

    workgroupBarrier();
  }

  if (row < dims.M && col < dims.N) {
    C[row * dims.N + col] = sum;
  }
}
`;
