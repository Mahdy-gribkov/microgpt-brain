import { useState, useCallback } from 'react';
import { MODEL_DEFAULTS, TRAINING_DEFAULTS, MODEL_PRESETS } from '../lib/constants';

export interface ModelConfigState {
  nLayer: number;
  nHead: number;
  nEmbd: number;
  blockSize: number;
  lr: number;
  maxSteps: number;
}

export function useModelConfig() {
  const [config, setConfig] = useState<ModelConfigState>({
    nLayer: MODEL_DEFAULTS.nLayer,
    nHead: MODEL_DEFAULTS.nHead,
    nEmbd: MODEL_DEFAULTS.nEmbd,
    blockSize: MODEL_DEFAULTS.blockSize,
    lr: TRAINING_DEFAULTS.lr,
    maxSteps: TRAINING_DEFAULTS.maxSteps,
  });
  const [activePreset, setActivePreset] = useState<string | null>('small');

  const handlePresetSelect = useCallback((preset: { nLayer: number; nHead: number; nEmbd: number; blockSize: number }) => {
    setConfig((prev) => ({ ...prev, ...preset }));
    const entry = Object.entries(MODEL_PRESETS).find(
      ([, v]) => v.nLayer === preset.nLayer && v.nHead === preset.nHead && v.nEmbd === preset.nEmbd
    );
    setActivePreset(entry ? entry[0] : null);
  }, []);

  const updateConfig = useCallback((c: ModelConfigState) => {
    setConfig(c);
    setActivePreset(null);
  }, []);

  return { config, activePreset, handlePresetSelect, updateConfig };
}
