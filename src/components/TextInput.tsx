'use client';

import { motion } from 'framer-motion';
import { SHAKESPEARE } from '../data/shakespeare';
import { PYTHON_CODE } from '../data/python-code';
import { SYSTEM_PROMPTS } from '../data/system-prompts';
import { SECURITY_LIMITS } from '../lib/constants';

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}

const SAMPLES = [
  { label: 'Shakespeare', data: SHAKESPEARE },
  { label: 'Python Code', data: PYTHON_CODE },
  { label: 'System Prompts', data: SYSTEM_PROMPTS },
];

const MAX_LEN = SECURITY_LIMITS.maxInputTextLength;
const WARN_THRESHOLD = MAX_LEN * 0.9;

export function TextInput({ value, onChange, disabled }: TextInputProps) {
  const handleChange = (newValue: string) => {
    onChange(newValue.slice(0, MAX_LEN));
  };

  const isNearLimit = value.length >= WARN_THRESHOLD;
  const isAtLimit = value.length >= MAX_LEN;

  return (
    <div className="card">
      <label className="block text-sm font-medium text-muted mb-2">
        Training Text
      </label>
      <textarea
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        disabled={disabled}
        placeholder="Paste any text here, or pick a sample below..."
        className="w-full h-40 md:h-48 bg-bg border border-border rounded-lg p-3 text-sm font-mono text-text resize-none focus:outline-none focus:border-amber disabled:opacity-50 transition-colors"
      />
      <div className="flex flex-wrap gap-2 mt-3">
        {SAMPLES.map((sample) => (
          <motion.button
            key={sample.label}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleChange(sample.data)}
            disabled={disabled}
            className="px-3 py-1.5 text-xs rounded-full bg-bg border border-border text-muted hover:text-amber hover:border-amber disabled:opacity-50 transition-colors"
          >
            {sample.label}
          </motion.button>
        ))}
      </div>
      {value && (
        <p className={`text-xs mt-2 ${isAtLimit ? 'text-red-400' : isNearLimit ? 'text-amber' : 'text-muted'}`}>
          {value.length.toLocaleString()} / {MAX_LEN.toLocaleString()} characters
          {isAtLimit && ' (limit reached)'}
        </p>
      )}
    </div>
  );
}
