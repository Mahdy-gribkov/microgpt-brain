'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { ModelConfig, ModelWeights } from '../lib/visualizer-types';

interface TrainingBridgeState {
  /** Live weights from the training worker */
  liveWeights: ModelWeights | null;
  /** Model config from the training worker */
  liveConfig: ModelConfig | null;
  /** Current training step when snapshot was taken */
  snapshotStep: number;
  /** Whether training is actively running */
  isTraining: boolean;
}

interface TrainingBridgeActions {
  updateSnapshot: (weights: ModelWeights, config: ModelConfig, step: number) => void;
  setIsTraining: (v: boolean) => void;
  clearSnapshot: () => void;
}

type TrainingBridgeContextValue = TrainingBridgeState & TrainingBridgeActions;

const TrainingBridgeContext = createContext<TrainingBridgeContextValue | null>(null);

export function TrainingBridgeProvider({ children }: { children: ReactNode }) {
  const [liveWeights, setLiveWeights] = useState<ModelWeights | null>(null);
  const [liveConfig, setLiveConfig] = useState<ModelConfig | null>(null);
  const [snapshotStep, setSnapshotStep] = useState(0);
  const [isTraining, setIsTraining] = useState(false);

  const updateSnapshot = useCallback((weights: ModelWeights, config: ModelConfig, step: number) => {
    setLiveWeights(weights);
    setLiveConfig(config);
    setSnapshotStep(step);
  }, []);

  const clearSnapshot = useCallback(() => {
    setLiveWeights(null);
    setLiveConfig(null);
    setSnapshotStep(0);
    setIsTraining(false);
  }, []);

  return (
    <TrainingBridgeContext.Provider
      value={{ liveWeights, liveConfig, snapshotStep, isTraining, updateSnapshot, setIsTraining, clearSnapshot }}
    >
      {children}
    </TrainingBridgeContext.Provider>
  );
}

export function useTrainingBridge(): TrainingBridgeContextValue {
  const ctx = useContext(TrainingBridgeContext);
  if (!ctx) throw new Error('useTrainingBridge must be used within TrainingBridgeProvider');
  return ctx;
}
