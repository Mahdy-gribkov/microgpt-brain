'use client';

import { SLIDER_RANGES, HYPERPARAMETER_TOOLTIPS } from '../lib/constants';
import { computeParamCount } from '../engine/model';
import { Tooltip } from './Tooltip';

interface ModelConfigProps {
  config: {
    nLayer: number;
    nHead: number;
    nEmbd: number;
    blockSize: number;
    lr: number;
    maxSteps: number;
  };
  onChange: (config: ModelConfigProps['config']) => void;
  disabled: boolean;
  paramCount: number;
}

interface SliderRowProps {
  label: string;
  tooltipKey: string;
  value: number;
  range: { min: number; max: number; step: number };
  onChange: (v: number) => void;
  disabled: boolean;
  format?: (v: number) => string;
}

function SliderRow({ label, tooltipKey, value, range, onChange, disabled, format }: SliderRowProps) {
  return (
    <div className="flex items-center gap-3">
      <Tooltip content={HYPERPARAMETER_TOOLTIPS[tooltipKey] || ''} side="right">
        <label className="text-xs text-muted w-20 shrink-0 flex items-center gap-1 cursor-help">
          {label}
          <span className="text-[10px] text-amber opacity-60">(?)</span>
        </label>
      </Tooltip>
      <input
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="flex-1 accent-amber h-1.5"
      />
      <span className="text-xs font-mono text-amber w-14 text-right">
        {format ? format(value) : value}
      </span>
    </div>
  );
}

export function ModelConfig({ config, onChange, disabled, paramCount }: ModelConfigProps) {
  const update = (key: keyof typeof config, value: number) => {
    onChange({ ...config, [key]: value });
  };

  const estimatedParams = computeParamCount(
    { blockSize: config.blockSize, nLayer: config.nLayer, nHead: config.nHead, nEmbd: config.nEmbd },
    80
  );

  const displayParams = paramCount > 0 ? paramCount : estimatedParams;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-text">Model Config</h2>
        <span className="text-xs font-mono text-amber">
          {(displayParams / 1000).toFixed(1)}K params
        </span>
      </div>
      <div className="space-y-2.5">
        <SliderRow label="Layers" tooltipKey="nLayer" value={config.nLayer} range={SLIDER_RANGES.nLayer} onChange={(v) => update('nLayer', v)} disabled={disabled} />
        <SliderRow label="Heads" tooltipKey="nHead" value={config.nHead} range={SLIDER_RANGES.nHead} onChange={(v) => update('nHead', v)} disabled={disabled} />
        <SliderRow label="Embed dim" tooltipKey="nEmbd" value={config.nEmbd} range={SLIDER_RANGES.nEmbd} onChange={(v) => update('nEmbd', v)} disabled={disabled} />
        <SliderRow label="Block size" tooltipKey="blockSize" value={config.blockSize} range={SLIDER_RANGES.blockSize} onChange={(v) => update('blockSize', v)} disabled={disabled} />
        <hr className="border-border" />
        <SliderRow label="LR" tooltipKey="lr" value={config.lr} range={SLIDER_RANGES.lr} onChange={(v) => update('lr', v)} disabled={disabled} format={(v) => v.toFixed(4)} />
        <SliderRow label="Max steps" tooltipKey="maxSteps" value={config.maxSteps} range={SLIDER_RANGES.maxSteps} onChange={(v) => update('maxSteps', v)} disabled={disabled} />
      </div>
    </div>
  );
}
