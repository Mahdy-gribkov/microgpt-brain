'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { GENERATION_DEFAULTS, SLIDER_RANGES, HYPERPARAMETER_TOOLTIPS } from '../lib/constants';
import { Tooltip } from './Tooltip';

interface GeneratePanelProps {
  onGenerate: (temperature: number, maxTokens: number) => void;
  generatedText: string;
  isGenerating: boolean;
  disabled: boolean;
  onCopyText?: () => void;
}

// Security: generatedText is rendered via React text node inside <pre>, which auto-escapes HTML.
// Never use dangerouslySetInnerHTML here — model output is untrusted.
export function GeneratePanel({ onGenerate, generatedText, isGenerating, disabled, onCopyText }: GeneratePanelProps) {
  const [temperature, setTemperature] = useState<number>(GENERATION_DEFAULTS.temperature);
  const [maxTokens, setMaxTokens] = useState<number>(GENERATION_DEFAULTS.maxTokens);
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copied, setCopied] = useState(false);
  const prevTextRef = useRef('');

  // Typewriter effect
  useEffect(() => {
    if (!generatedText || generatedText === prevTextRef.current) return;
    prevTextRef.current = generatedText;

    const startIdx = displayText.length;
    if (startIdx >= generatedText.length) {
      setDisplayText(generatedText);
      return;
    }

    setIsTyping(true);
    let idx = startIdx;
    const timer = setInterval(() => {
      idx++;
      setDisplayText(generatedText.slice(0, idx));
      if (idx >= generatedText.length) {
        clearInterval(timer);
        setIsTyping(false);
      }
    }, 20);

    return () => clearInterval(timer);
  }, [generatedText, displayText.length]);

  // Reset display text when generatedText is cleared
  useEffect(() => {
    if (!generatedText) {
      setDisplayText('');
      prevTextRef.current = '';
    }
  }, [generatedText]);

  const handleCopy = async () => {
    if (!generatedText) return;
    try {
      await navigator.clipboard.writeText(generatedText);
      setCopied(true);
      onCopyText?.();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API may fail in some contexts
    }
  };

  return (
    <div className="card">
      <h2 className="text-sm font-medium text-text mb-3">Generate Text</h2>

      <div className="space-y-2.5 mb-4">
        <div className="flex items-center gap-3">
          <Tooltip content={HYPERPARAMETER_TOOLTIPS.temperature} side="right">
            <label className="text-xs text-muted w-20 shrink-0 flex items-center gap-1 cursor-help">
              Temp
              <span className="text-[10px] text-amber opacity-60">(?)</span>
            </label>
          </Tooltip>
          <input
            type="range"
            min={SLIDER_RANGES.temperature.min}
            max={SLIDER_RANGES.temperature.max}
            step={SLIDER_RANGES.temperature.step}
            value={temperature}
            onChange={(e) => setTemperature(Number(e.target.value))}
            disabled={disabled}
            aria-label="Temperature"
            className="flex-1 accent-amber h-1.5"
          />
          <span className="text-xs font-mono text-amber w-14 text-right">
            {temperature.toFixed(1)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Tooltip content={HYPERPARAMETER_TOOLTIPS.maxTokens} side="right">
            <label className="text-xs text-muted w-20 shrink-0 flex items-center gap-1 cursor-help">
              Max tokens
              <span className="text-[10px] text-amber opacity-60">(?)</span>
            </label>
          </Tooltip>
          <input
            type="range"
            min={SLIDER_RANGES.maxTokens.min}
            max={SLIDER_RANGES.maxTokens.max}
            step={SLIDER_RANGES.maxTokens.step}
            value={maxTokens}
            onChange={(e) => setMaxTokens(Number(e.target.value))}
            disabled={disabled}
            aria-label="Maximum tokens to generate"
            className="flex-1 accent-amber h-1.5"
          />
          <span className="text-xs font-mono text-amber w-14 text-right">
            {maxTokens}
          </span>
        </div>
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onGenerate(temperature, maxTokens)}
        disabled={disabled || isGenerating}
        className="w-full py-2.5 rounded-lg border border-amber text-amber font-medium text-sm hover:bg-amber hover:text-bg disabled:opacity-40 transition-colors"
      >
        {isGenerating ? 'Generating...' : 'Generate'}
      </motion.button>

      {(displayText || isGenerating) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 bg-bg border border-border rounded-lg relative group"
        >
          <pre className="text-sm font-mono text-text whitespace-pre-wrap break-words leading-relaxed">
            {displayText}
            {(isTyping || isGenerating) && (
              <span className="inline-block w-0.5 h-4 bg-amber typewriter-cursor ml-0.5 align-middle" />
            )}
          </pre>
          {generatedText && !isGenerating && (
            <button
              type="button"
              onClick={handleCopy}
              aria-label="Copy generated text"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-muted hover:text-amber px-2 py-1 rounded border border-border hover:border-amber/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          )}
        </motion.div>
      )}

      {disabled && !generatedText && (
        <p className="text-xs text-muted mt-3 text-center">
          Train a model first to generate text
        </p>
      )}
    </div>
  );
}
