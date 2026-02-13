/**
 * GPU device management — check for WebGPU support, request adapter and device.
 */

export interface GpuContext {
  device: GPUDevice;
  adapterName: string;
}

export async function initGpu(): Promise<GpuContext | null> {
  if (typeof navigator === 'undefined' || !navigator.gpu) {
    return null;
  }

  try {
    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: 'high-performance',
    });

    if (!adapter) return null;

    const device = await adapter.requestDevice({
      requiredLimits: {
        maxComputeWorkgroupSizeX: 256,
        maxStorageBufferBindingSize: 128 * 1024 * 1024, // 128MB
      },
    });

    // Handle device loss gracefully
    device.lost.then((info) => {
      console.warn(`WebGPU device lost: ${info.reason}`, info.message);
    });

    const adapterName = adapter.info?.device || adapter.info?.description || 'WebGPU Device';

    return { device, adapterName };
  } catch (err) {
    console.warn('WebGPU init failed:', err);
    return null;
  }
}
