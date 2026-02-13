'use client';

import { Tooltip } from './Tooltip';

interface GpuStatusProps {
  available: boolean | null;
  gpuName: string;
}

export function GpuStatus({ available, gpuName }: GpuStatusProps) {
  if (available === null) {
    return (
      <Tooltip content="Checking if your browser supports WebGPU for hardware-accelerated training." side="bottom">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono bg-bg border border-border text-muted cursor-help">
          <span className="w-1.5 h-1.5 rounded-full bg-muted animate-pulse" />
          Detecting...
        </span>
      </Tooltip>
    );
  }

  if (available) {
    return (
      <Tooltip content={`WebGPU active — matrix operations offloaded to ${gpuName}. Training will be significantly faster.`} side="bottom">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono bg-bg border border-green-800 text-green-400 cursor-help">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
          GPU: {gpuName}
        </span>
      </Tooltip>
    );
  }

  return (
    <Tooltip content="WebGPU not available — training runs on CPU. Still works, just slower for large models." side="bottom">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono bg-bg border border-amber-dim text-amber cursor-help">
        <span className="w-1.5 h-1.5 rounded-full bg-amber" />
        CPU Mode
      </span>
    </Tooltip>
  );
}
