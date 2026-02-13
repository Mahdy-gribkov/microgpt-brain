'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { SPRING } from '../lib/constants';
import type { TrainingStatus } from './Playground';

interface TrainingControlsProps {
  status: TrainingStatus;
  currentStep: number;
  totalSteps: number;
  currentLoss: number;
  onTrain: () => void;
  onStop: () => void;
  onReset: () => void;
  disabled: boolean;
}

export function TrainingControls({
  status,
  currentStep,
  totalSteps,
  currentLoss,
  onTrain,
  onStop,
  onReset,
  disabled,
}: TrainingControlsProps) {
  const progress = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;
  const isTraining = status === 'training' || status === 'initializing';

  return (
    <div className={`card ${isTraining ? 'training-pulse' : ''}`}>
      <div className="flex gap-2 mb-3">
        {status === 'idle' && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onTrain}
            disabled={disabled}
            className="flex-1 py-2.5 rounded-lg bg-amber text-bg font-medium text-sm hover:bg-amber-light disabled:opacity-40 transition-colors"
          >
            Train
          </motion.button>
        )}

        {isTraining && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onStop}
            className="flex-1 py-2.5 rounded-lg bg-red-600 text-white font-medium text-sm hover:bg-red-500 transition-colors"
          >
            Stop
          </motion.button>
        )}

        {(status === 'complete' || status === 'error') && (
          <>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onTrain}
              disabled={disabled}
              className="flex-1 py-2.5 rounded-lg bg-amber text-bg font-medium text-sm hover:bg-amber-light disabled:opacity-40 transition-colors"
            >
              Re-train
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onReset}
              className="px-4 py-2.5 rounded-lg border border-border text-muted text-sm hover:text-text transition-colors"
            >
              Reset
            </motion.button>
          </>
        )}
      </div>

      {/* Enhanced progress bar */}
      {isTraining && (
        <div className="mb-3">
          <div className="h-2 bg-bg rounded-full overflow-hidden relative">
            <motion.div
              className="h-full progress-gradient rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
            <div className="absolute inset-0 overflow-hidden rounded-full">
              <div className="w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent shimmer" />
            </div>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-muted">{progress.toFixed(0)}%</span>
            <span className="text-[10px] text-muted">Step {currentStep}/{totalSteps}</span>
          </div>
        </div>
      )}

      {status === 'initializing' && (
        <p className="text-xs text-muted animate-pulse">Initializing model...</p>
      )}

      {/* Completion celebration */}
      <AnimatePresence>
        {status === 'complete' && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={SPRING.bouncy}
            className="flex items-center gap-2 mt-2 p-2 bg-green-900/20 border border-green-800/30 rounded-lg"
          >
            <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-xs text-green-400">
              Training Complete! Final loss: {currentLoss.toFixed(3)}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
