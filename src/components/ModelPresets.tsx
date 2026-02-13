'use client';

import { motion } from 'framer-motion';
import { MODEL_PRESETS } from '../lib/constants';

interface ModelPresetsProps {
  onSelect: (preset: { nLayer: number; nHead: number; nEmbd: number; blockSize: number }) => void;
  disabled: boolean;
  activePreset: string | null;
}

const presetEntries = Object.entries(MODEL_PRESETS) as [string, (typeof MODEL_PRESETS)[keyof typeof MODEL_PRESETS]][];

export function ModelPresets({ onSelect, disabled, activePreset }: ModelPresetsProps) {
  return (
    <div className="flex gap-2">
      {presetEntries.map(([key, preset]) => {
        const isActive = activePreset === key;
        return (
          <motion.button
            key={key}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect({ nLayer: preset.nLayer, nHead: preset.nHead, nEmbd: preset.nEmbd, blockSize: preset.blockSize })}
            disabled={disabled}
            className={`flex-1 py-2 px-3 rounded-lg border text-xs font-medium transition-all disabled:opacity-40 ${
              isActive
                ? 'border-amber text-amber shadow-[0_0_12px_rgba(212,148,58,0.2)]'
                : 'border-border text-muted hover:text-text hover:border-amber/50'
            }`}
          >
            <div>{preset.label}</div>
            <div className="text-[10px] opacity-60 mt-0.5">{preset.desc}</div>
          </motion.button>
        );
      })}
    </div>
  );
}
