/**
 * GpuTensor — wraps a GPUBuffer for GPU-side tensor data.
 * Handles upload from CPU and async readback.
 */

import { Tensor } from '../engine/tensor';

export class GpuTensor {
  readonly buffer: GPUBuffer;
  readonly shape: number[];
  readonly size: number;
  private device: GPUDevice;

  constructor(device: GPUDevice, buffer: GPUBuffer, shape: number[], size: number) {
    this.device = device;
    this.buffer = buffer;
    this.shape = shape;
    this.size = size;
  }

  static fromTensor(device: GPUDevice, tensor: Tensor): GpuTensor {
    const buffer = device.createBuffer({
      size: tensor.data.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });

    new Float32Array(buffer.getMappedRange()).set(tensor.data);
    buffer.unmap();

    return new GpuTensor(device, buffer, [...tensor.shape], tensor.size);
  }

  static createEmpty(device: GPUDevice, shape: number[]): GpuTensor {
    const size = shape.reduce((a, b) => a * b, 1);
    const buffer = device.createBuffer({
      size: size * 4, // float32
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });
    return new GpuTensor(device, buffer, shape, size);
  }

  async toCpu(): Promise<Tensor> {
    const staging = this.device.createBuffer({
      size: this.size * 4,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });

    const encoder = this.device.createCommandEncoder();
    encoder.copyBufferToBuffer(this.buffer, 0, staging, 0, this.size * 4);
    this.device.queue.submit([encoder.finish()]);

    await staging.mapAsync(GPUMapMode.READ);
    const data = new Float32Array(staging.getMappedRange()).slice();
    staging.unmap();
    staging.destroy();

    return new Tensor(data, [...this.shape]);
  }

  destroy(): void {
    this.buffer.destroy();
  }
}
