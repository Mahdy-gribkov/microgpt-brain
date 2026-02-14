/**
 * GpuBackend — WebGPU-accelerated compute for the bottleneck ops (matmul, linear).
 * Falls through to CPU for ops not yet GPU-accelerated.
 */

import type { ComputeBackend } from '../engine/backend';
import { Tensor } from '../engine/tensor';
import * as cpuOps from '../engine/tensor-ops-cpu';
import { GpuTensor } from './gpu-tensor';
import { matmulShader } from './shaders/matmul';
import { softmaxShader } from './shaders/softmax';
import { reluShader, addShader, scaleShader } from './shaders/elementwise';
// rmsnormShader available but not used (CPU is faster for RMSNorm due to scalar readback)
// import { rmsnormShader } from './shaders/rmsnorm';

export class GpuBackend implements ComputeBackend {
  readonly name = 'webgpu' as const;
  private device: GPUDevice;
  private pipelineCache = new Map<string, GPUComputePipeline>();

  constructor(device: GPUDevice) {
    this.device = device;
  }

  private getPipeline(key: string, code: string): GPUComputePipeline {
    let pipeline = this.pipelineCache.get(key);
    if (!pipeline) {
      const shaderModule = this.device.createShaderModule({ code });
      pipeline = this.device.createComputePipeline({
        layout: 'auto',
        compute: { module: shaderModule, entryPoint: 'main' },
      });
      this.pipelineCache.set(key, pipeline);
    }
    return pipeline;
  }

  private createUniformBuffer(data: ArrayBuffer): GPUBuffer {
    const buffer = this.device.createBuffer({
      size: Math.max(data.byteLength, 16), // minimum 16 bytes for alignment
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Uint8Array(buffer.getMappedRange()).set(new Uint8Array(data));
    buffer.unmap();
    return buffer;
  }

  async matmul(a: Tensor, b: Tensor): Promise<Tensor> {
    const M = a.shape[0];
    const K = a.shape[1];
    const N = b.shape[1];

    // For very small matrices, CPU is faster (no upload/readback overhead)
    if (M * K * N < 4096) {
      return cpuOps.matmul(a, b);
    }

    const pipeline = this.getPipeline('matmul', matmulShader);

    const gpuA = GpuTensor.fromTensor(this.device, a);
    const gpuB = GpuTensor.fromTensor(this.device, b);
    const gpuC = GpuTensor.createEmpty(this.device, [M, N]);

    const dims = new Uint32Array([M, K, N]);
    const uniformBuf = this.createUniformBuffer(dims.buffer);

    const bindGroup = this.device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: uniformBuf } },
        { binding: 1, resource: { buffer: gpuA.buffer } },
        { binding: 2, resource: { buffer: gpuB.buffer } },
        { binding: 3, resource: { buffer: gpuC.buffer } },
      ],
    });

    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(
      Math.ceil(N / 16),
      Math.ceil(M / 16),
    );
    pass.end();
    this.device.queue.submit([encoder.finish()]);

    const result = await gpuC.toCpu();

    gpuA.destroy();
    gpuB.destroy();
    gpuC.destroy();
    uniformBuf.destroy();

    return result;
  }

  async linear(x: Tensor, w: Tensor): Promise<Tensor> {
    // linear: x [K] @ W [outDim, K]^T -> [outDim]
    // Reshape to matmul: x [1, K] @ W^T [K, outDim] -> [1, outDim]
    const inDim = w.shape[1];
    const outDim = w.shape[0];

    // For small linear layers, CPU is faster
    if (inDim * outDim < 4096) {
      return cpuOps.linear(x, w);
    }

    // Transpose W to [K, outDim]
    const wT = Tensor.zeros([inDim, outDim]);
    for (let i = 0; i < outDim; i++) {
      for (let j = 0; j < inDim; j++) {
        wT.data[j * outDim + i] = w.data[i * inDim + j];
      }
    }

    // Reshape x to [1, K]
    const xMat = new Tensor(x.data, [1, inDim]);
    const resultMat = await this.matmul(xMat, wT);

    // Reshape back to [outDim]
    return new Tensor(resultMat.data, [outDim]);
  }

  async softmax(x: Tensor): Promise<Tensor> {
    // For small vectors, CPU softmax is fast enough
    if (x.size < 512) {
      return cpuOps.softmax(x);
    }

    const pipeline = this.getPipeline('softmax', softmaxShader);

    const gpuIn = GpuTensor.fromTensor(this.device, x);
    const gpuOut = GpuTensor.createEmpty(this.device, [...x.shape]);

    const params = new Uint32Array([x.size]);
    const uniformBuf = this.createUniformBuffer(params.buffer);

    const bindGroup = this.device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: uniformBuf } },
        { binding: 1, resource: { buffer: gpuIn.buffer } },
        { binding: 2, resource: { buffer: gpuOut.buffer } },
      ],
    });

    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(1); // Single workgroup for softmax
    pass.end();
    this.device.queue.submit([encoder.finish()]);

    const result = await gpuOut.toCpu();

    gpuIn.destroy();
    gpuOut.destroy();
    uniformBuf.destroy();

    return result;
  }

  rmsNorm(x: Tensor, eps?: number): { out: Tensor; rms: number } {
    // CPU — GPU RMSNorm would require readback for rms scalar which is slow
    return cpuOps.rmsNorm(x, eps);
  }

  async relu(x: Tensor): Promise<Tensor> {
    if (x.size < 1024) {
      return cpuOps.relu(x);
    }

    const pipeline = this.getPipeline('relu', reluShader);

    const gpuIn = GpuTensor.fromTensor(this.device, x);
    const gpuOut = GpuTensor.createEmpty(this.device, [...x.shape]);

    const params = new Uint32Array([x.size]);
    const uniformBuf = this.createUniformBuffer(params.buffer);

    const bindGroup = this.device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: uniformBuf } },
        { binding: 1, resource: { buffer: gpuIn.buffer } },
        { binding: 2, resource: { buffer: gpuOut.buffer } },
      ],
    });

    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(Math.ceil(x.size / 256));
    pass.end();
    this.device.queue.submit([encoder.finish()]);

    const result = await gpuOut.toCpu();

    gpuIn.destroy();
    gpuOut.destroy();
    uniformBuf.destroy();

    return result;
  }

  async add(a: Tensor, b: Tensor): Promise<Tensor> {
    if (a.size < 1024) {
      return cpuOps.add(a, b);
    }

    const pipeline = this.getPipeline('add', addShader);

    const gpuA = GpuTensor.fromTensor(this.device, a);
    const gpuB = GpuTensor.fromTensor(this.device, b);
    const gpuC = GpuTensor.createEmpty(this.device, [...a.shape]);

    const params = new Uint32Array([a.size]);
    const uniformBuf = this.createUniformBuffer(params.buffer);

    const bindGroup = this.device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: uniformBuf } },
        { binding: 1, resource: { buffer: gpuA.buffer } },
        { binding: 2, resource: { buffer: gpuB.buffer } },
        { binding: 3, resource: { buffer: gpuC.buffer } },
      ],
    });

    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(Math.ceil(a.size / 256));
    pass.end();
    this.device.queue.submit([encoder.finish()]);

    const result = await gpuC.toCpu();

    gpuA.destroy();
    gpuB.destroy();
    gpuC.destroy();
    uniformBuf.destroy();

    return result;
  }

  async scale(x: Tensor, s: number): Promise<Tensor> {
    if (x.size < 1024) {
      return cpuOps.scale(x, s);
    }

    const pipeline = this.getPipeline('scale', scaleShader);

    const gpuIn = GpuTensor.fromTensor(this.device, x);
    const gpuOut = GpuTensor.createEmpty(this.device, [...x.shape]);

    // Pack N (u32) + scalar (f32) into uniform buffer
    const paramBuf = new ArrayBuffer(8);
    new Uint32Array(paramBuf, 0, 1)[0] = x.size;
    new Float32Array(paramBuf, 4, 1)[0] = s;
    const uniformBuf = this.createUniformBuffer(paramBuf);

    const bindGroup = this.device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: uniformBuf } },
        { binding: 1, resource: { buffer: gpuIn.buffer } },
        { binding: 2, resource: { buffer: gpuOut.buffer } },
      ],
    });

    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(Math.ceil(x.size / 256));
    pass.end();
    this.device.queue.submit([encoder.finish()]);

    const result = await gpuOut.toCpu();

    gpuIn.destroy();
    gpuOut.destroy();
    uniformBuf.destroy();

    return result;
  }
}
