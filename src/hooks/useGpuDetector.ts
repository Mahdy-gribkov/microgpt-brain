import { useState, useEffect } from 'react';

export function useGpuDetector() {
    const [available, setAvailable] = useState<boolean | null>(null);
    const [gpuName, setGpuName] = useState<string>('');

    useEffect(() => {
        let mounted = true;

        async function checkGpu() {
            if (!navigator.gpu) {
                if (mounted) {
                    setAvailable(false);
                    setGpuName('');
                }
                return;
            }

            try {
                // Race condition: if adapter request takes too long, fallback to CPU
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('GPU detection timeout')), 3000)
                );

                const adapterPromise = navigator.gpu.requestAdapter();

                const adapter = await Promise.race([adapterPromise, timeoutPromise]) as GPUAdapter | null;

                if (!adapter) {
                    if (mounted) {
                        setAvailable(false);
                        setGpuName('');
                    }
                    return;
                }

                // @ts-expect-error - requestAdapterInfo is not yet in all type definitions
                const info = await adapter.requestAdapterInfo();
                if (mounted) {
                    setAvailable(true);
                    setGpuName(info.device || info.description || 'Generic WebGPU');
                }
            } catch (err) {
                console.warn('WebGPU detection failed:', err);
                if (mounted) {
                    setAvailable(false);
                    setGpuName('');
                }
            }
        }

        checkGpu();

        return () => {
            mounted = false;
        };
    }, []);

    return { available, gpuName };
}
